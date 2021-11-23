import to from "await-to-js";

export function TypedAPI<
  API extends Record<
    string,
    {
      get?: { req?: unknown; res?: unknown };
      post?: { req?: unknown; res?: unknown };
    }
  >
>(baseURL: string) {

  //////////////////
  // HELPER TYPES //
  //////////////////

  type RequestBody<Route, Method> = Route extends keyof API
    ? Method extends keyof API[Route]
      ? "req" extends keyof API[Route][Method]
        ? API[Route][Method]["req"]
        : never
      : never
    : unknown;

  type ResponseBody<Route, Method> = Route extends keyof API
    ? Method extends keyof API[Route]
      ? "res" extends keyof API[Route][Method]
        ? API[Route][Method]["res"]
        : void
      : never
    : unknown;

  type Query<Params> = {
    [K in keyof Params]: Params[K] extends string
      ?
          | ({} extends Omit<Params, K> ? Params[K] : never)
          | `${Params[K]}&${Query<Omit<Params, K>>}`
      : never;
  }[keyof Params];

  type APIGetPath = {
    [Route in keyof API]: Route extends string
      ? "get" extends keyof API[Route]
        ?
            | Route
            | `${Route}?${"req" extends keyof API[Route]["get"]
                ? Query<{
                    [Param in keyof API[Route]["get"]["req"]]: `${Param extends string
                      ? Param
                      : never}=${API[Route]["get"]["req"][Param] extends string
                      ? API[Route]["get"]["req"][Param]
                      : never}`;
                  }>
                : never}`
        : never
      : never;
  }[keyof API];

  type APIPath = APIGetPath | Extract<keyof API, string>;

  //////////////////////
  // HELPER FUNCTIONS //
  //////////////////////

  type FullURL<Path extends string> = `${typeof baseURL}${Path}`;
  const api = <Path extends APIPath>(path: Path) =>
    `${baseURL}${path}` as FullURL<Path>;

  const removeUndefined = (obj: any) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([k, v]) => typeof v !== "undefined")
    );
  };

  type PathWithEmptyRequestBody =
    | {
        [Route in keyof API]: RequestBody<Route, "post"> extends never
          ? Route
          : never;
      }[keyof API]
    | APIGetPath;

  function fetchAPI<Path extends PathWithEmptyRequestBody>(
    url: Path
  ): Promise<ResponseBody<Path, "post">>;
  function fetchAPI<Path extends keyof API>(
    url: Path,
    body: RequestBody<Path, "post">
  ): Promise<ResponseBody<Path, "post">>;
  async function fetchAPI<Path extends APIPath>(url: Path, body?: unknown) {
    const [err0, res] = await to(
      fetch(
        api(url),
        removeUndefined({
          method: "POST",
          headers: body && {
            "Content-Type": "application/json",
          },
          body: body && JSON.stringify(removeUndefined(body)),
        })
      )
    );
    if (err0) throw err0;
    if (!res?.ok)
      throw Object.assign(new Error("Fetch failed"), { response: res });

    const [err1, result] = await to(res.json());
    if (err1) throw err1;
    return result;
  }

  return {api, fetchAPI}
}
