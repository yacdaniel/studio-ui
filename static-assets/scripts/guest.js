/*
 * Copyright (C) 2007-2019 Crafter Software Corporation. All Rights Reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

crafterDefine('guest', [
  'crafter', 'jquery', 'communicator', 'ice-overlay',
], function (crafter, $, Communicator, ICEOverlay) {
  'use strict';

  $.noConflict(true);

  if (!window.location.origin) {
    window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  }

  var
    Topics = crafter.studio.preview.Topics,
    Constants = { TIME_RESIZE: 500, TIME_SCROLL: 250 },
    communicator,
    origin,
    timeout = null,
    count = 0,
    overlay = new ICEOverlay(),
    $document = $(document),
    $window = $(window),
    dndController,
    pointerControllerVar,
    iceToolsOn = false;

  window.studioICERepaint = iceRepaint;

  return {
    init: init,
    iceRepaint: iceRepaint,
    repaintPencils: repaintPencils,
    reportNavigation: reportNavigation
  };

  function reportNavigation(location, url) {
    communicator.publish(Topics.GUEST_SITE_URL_CHANGE, { location, url });
  }

  function init(config) {

    origin = config.hostOrigin;

    communicator = new Communicator({
      window: window.parent,
      origin: origin
    }, origin);

    communicator.on(Topics.START_DRAG_AND_DROP, function (message) {
      crafterRequire(['dnd-controller'], function (DnDController) {

        (typeof dndController === 'undefined') && (dndController = new DnDController({
          communicator: communicator
        }));

        dndController.start(message.components, message.contentModel, message.browse);

        var translation = message.translation;
        var elements = $('[data-translation]');
        elements.each(function () {
          var translationAttr = $(this).attr("data-translation");
          if (translationAttr == "done") {
            $(this).html(translation.done);
          }
          if (translationAttr == "components") {
            $(this).html(translation.components);
          }
          if (translationAttr == "addComponent") {
            $(this).html(translation.addComponent);
          }
        });
      });
    });

    communicator.on(Topics.DND_COMPONENTS_PANEL_OFF, function (message) {
      crafterRequire(['dnd-controller'], function (DnDController) {

        (typeof dndController === 'undefined') && (dndController = new DnDController({
          communicator: communicator
        }));

        dndController.done();
      });
    });

    communicator.on(Topics.DND_CREATE_BROWSE_COMP, function (message) {
      crafterRequire(['pointer-controller'], function (pointerController) {

        (typeof pointerControllerVar === 'undefined') && (pointerControllerVar = new pointerController({
          communicator: communicator
        }));

        pointerControllerVar.start(message.component, message.initialContentModel);

      });
    });

    communicator.on(Topics.REFRESH_PREVIEW, function (message) {
      window.location.reload();
    })

    communicator.on(Topics.ICE_TOOLS_OFF, function (message) {
      iceToolsOn = false;
      removeICERegions();
    });

    // Enable pencils, calls an event that renders the pencils (visual, no model in between)
    communicator.on(Topics.ICE_TOOLS_ON, function (message) {
      iceToolsOn = true;
      initICERegions();
    });

    communicator.on(Topics.REPAINT_PENCILS, repaintPencils);

    communicator.on(Topics.ICE_TOOLS_REGIONS, function (message) {
      var elt = document.querySelectorAll('[data-studio-ice' + message.label + '="' + message.region + '"]')[0];
      if (elt) {
        elt.scrollIntoView();
        window.scrollBy(0, -150);
        window.setTimeout(function () {
          initOverlay($(elt));
          window.setTimeout(function () {
            overlay.hide();
          }, 1000);
        }, 500);
      } else {
        alert("Region " + message.region + " could not be found");
      }
    });

    communicator.on(Topics.INIT_ICE_REGIONS, initIceRegions_resizeIceRegions_handler);

    communicator.on(Topics.RESIZE_ICE_REGIONS, initIceRegions_resizeIceRegions_handler);

    communicator.on(Topics.CHANGE_GUEST_REQUEST, (params) => {
      const locationOrigin = window.location.origin;
      if (window.location.href.replace(locationOrigin, '') !== params.url) {
        window.location.href = `${locationOrigin}${params.url}`;
      }
    });

    // When the page has successfully loaded, notify the host window of it's readiness
    communicator.publish(Topics.GUEST_SITE_LOAD, {
      location: window.location.href,
      url: window.location.href.replace(window.location.origin, '')
    });

    communicator.publish(Topics.IS_REVIEWER);

    // ICE zone highlighting on hover
    $document.on('mouseover', '.studio-ice-indicator', function (e) {

      var $i = $(this),
          $e = $(crafter.String('[data-studio-ice-target="%@"]').fmt($i.data('studioIceTrigger')));

      initOverlay($e);

    }).on('mouseout', '.studio-ice-indicator', function (e) {
      overlay.hide();
    });

    // Event on pencil click, publishes ICE_ZONE_ON, which opens the form
    $document.on('click', '.studio-ice-indicator', function (e) {
      let pencilClasses =  'fa-pencil icon-yellow';
      let spinnerClases = 'fa-spinner fa-spin icon-default';

      if($(e.target).hasClass(spinnerClases)) return false;

      $(e.target).removeClass(pencilClasses);
      $(e.target).addClass(spinnerClases);

      setTimeout(function () {
        $(e.target).removeClass(spinnerClases);
        $(e.target).addClass(pencilClasses);
      }, 4000);

      var $i = $(this);
      var $e = $(crafter.String('[data-studio-ice-target="%@"]').fmt($i.data('studioIceTrigger')));
      var iceId = $e.data('studioIce');
      var icePath = $e.data('studioIcePath');
      var iceEmbeddedItemId = $e.data('studioEmbeddedItemId');

      var position = $e.offset(),
        props = {
          top: position.top,
          left: position.left,
          width: $e.width(),
          height: $e.height()
        };

      props.iceId = iceId;
      props.itemId = icePath;
      props.embeddedItemId = iceEmbeddedItemId;
      props.scrollTop = $window.scrollTop();
      props.scrollLeft = $window.scrollLeft();

      communicator.publish(Topics.ICE_ZONE_ON, props);

    });

    $(window).resize(function (e) {
      clearSetTimeout(Constants.TIME_RESIZE);
    });

    $('window, *').scroll(function (e) {
      clearSetTimeout(Constants.TIME_SCROLL);
    });

    loadCss(config.hostOrigin + crafter.join(
      '/',
      config.studioContext,
      config.studioStaticAssets,
      'styles',
      'guest.css'
    ));

    if (!$('link[href*=\'font-awesome\']').length) {
      loadCss(config.hostOrigin + crafter.join(
        '/',
        config.studioContext,
        config.studioStaticAssets,
        'themes',
        'cstudioTheme',
        'css',
        'font-awesome.min.css'
      ));
    }

    setRegionsCookie();

  }

  function iceRepaint() {
    clearSetTimeout(Constants.TIME_RESIZE);
  }

  function initIceRegions_resizeIceRegions_handler(message) {
    if (!message) {
      iceToolsOn && initICERegions();
    } else {
      iceToolsOn = (!!message.iceOn) && (message.componentsOn != 'true');
      if (
        // TODO: REFACTOR
        // !!(window.parent.sessionStorage.getItem('ice-on')) &&
        // window.parent.sessionStorage.getItem('components-on') != 'true'
        iceToolsOn
      ) {
        initICERegions();
      }
    }
  }

  function loadCss(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  function setRegionsCookie() {

    var
      elts = document.querySelectorAll('[data-studio-ice]'),
      regions = [];
    if (elts.length > 0) {
      for (var i = 0; i <= (elts.length) - 1; i++) {
        regions.push({
          id: elts[i].getAttribute('data-studio-ice'),
          formId: elts[i].getAttribute('data-studio-ice'),
          label: elts[i].getAttribute('data-studio-ice-label')
        });
      }
    }

    communicator.publish(Topics.RESET_ICE_TOOLS_CONTENT, JSON.stringify(regions));

  }

  // Rendering of a single pencil based on an element
  function renderICESection(elem) {
    const $elem = $(elem),
          position = $elem.offset(),
          iceRef = $elem.data('studioIce') + '-' + count++;

    $elem.attr('data-studio-ice-target', iceRef);

    let flag = false;
    const compElement = $("[data-studio-ice-target='" + iceRef + "']");
    // if element exists -> set flag true to avoid re-rendering
    $('.studio-ice-indicator').each(function () {
      if ($(this).data("studioIceTrigger") == iceRef) {
        flag = true;
      }
    });

    if (!flag && compElement.is(':visible')) {
      const aux = $(crafter.String('<i class="studio-ice-indicator fa fa-pencil f18 icon-yellow" data-studio-ice-trigger="%@"></i>').fmt(iceRef))
        .css({
          top: position.top,
          left: position.left
        });
      aux.appendTo('body');
    }
  }

  // Rendering of the pencils, no model involved at this moment
  function initICERegions() {
    removeICERegions();
    var elems = document.querySelectorAll('[data-studio-ice]');

    for (var i = 0; i < elems.length; ++i) {
      // Renders a single pencil based on the element's props.
      renderICESection(elems[i]);

      if (elems[i].getAttribute("data-studio-ice-label")) {
        elems[i].setAttribute("data-studio-ice-label", elems[i].getAttribute("data-studio-ice-label").replace(/ /g, "__"));
      }
    }
  }

  function removeICERegions() {
    if ($('.studio-ice-indicator').length > 0) {
      $('.studio-ice-indicator').remove();
    }
  }

  function repaintPencils() {
    if (iceToolsOn) {
      initICERegions();
    }
  }

  function initOverlay(elt) {
    var position = elt.offset(),
      width,
      height,
      boxSizing = window.getComputedStyle(elt[0], ':before').getPropertyValue('box-sizing');

    if (boxSizing == "border-box") {
      width = elt.outerWidth();
      height = elt.outerHeight();
    } else {
      width = elt.width() - 4; // border-left-width + border-right-width = 4,
      height = elt.height() - 4; // border-top-width + border-bottom-width = 4
    }

    var props = {
      top: position.top,
      left: position.left,
      width: width,
      height: height
    };

    overlay.show(props);
  }

  function clearSetTimeout(time) {
    removeICERegions();
    clearTimeout(timeout);
    timeout = setTimeout(resizeProcess, time);
  }

  function resizeProcess() {
    communicator.publish(Topics.IS_REVIEWER, true);
  }

});
