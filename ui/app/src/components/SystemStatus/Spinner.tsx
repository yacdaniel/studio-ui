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

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';

const useStyles = makeStyles(theme => ({
  progress: {
    margin: theme.spacing(2),
  },
  center: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    background: (props: any) => props.background,
    transform: 'translate(-50%, -50%)',
  }
}));

interface SpinnerProps {
  background?: string,
}

export default function Spinner(props: SpinnerProps) {
  const classes = useStyles({ background: props.background || '#fff' });
  // @ts-ignore
  return (
    <div className={classes.center}>
      <CircularProgress className={classes.progress} />
    </div>
  );
}