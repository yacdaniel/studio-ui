import { get } from "../utils/ajax";

export function fetchPackages (siteId: string) {
  return get(`/studio/api/2/publish/packages?siteId=${siteId}`, {'X-XSRF-TOKEN': '060f063c-7812-4426-abfa-a1169d1e300c'})
}
