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
  type FullURL<Path extends string> = `${typeof baseURL}${Path}`;
  const api = <Path extends APIPath<API>>(path: Path) =>
    `${baseURL}${path}` as FullURL<Path>;

  const removeUndefined = (obj: any) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([k, v]) => typeof v !== "undefined")
    );
  };

  type PathWithEmptyRequestBody =
    | {
        [Route in keyof API]: RequestBody<API, Route, "post"> extends never
          ? Route
          : never;
      }[keyof API]
    | APIGetPath<API>;

  function fetchAPI<Path extends PathWithEmptyRequestBody>(
    url: Path
  ): Promise<ResponseBody<API, Path, "post">>;
  function fetchAPI<Path extends keyof API>(
    url: Path,
    body: RequestBody<API, Path, "post">
  ): Promise<ResponseBody<API, Path, "post">>;
  async function fetchAPI<Path extends APIPath<API>>(
    url: Path,
    body?: unknown
  ) {
    const [err0, res] = await to(
      fetch(
        api(url),
        removeUndefined({
          method: "POST",
          credentials: "include",
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

  return { api, fetchAPI };
}

//////////////////
// HELPER TYPES //
//////////////////

export type RequestBody<API, Route, Method> = Route extends keyof API
  ? Method extends keyof API[Route]
    ? "req" extends keyof API[Route][Method]
      ? API[Route][Method]["req"]
      : never
    : never
  : unknown;

export type ResponseBody<API, Route, Method> = Route extends keyof API
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

export type APIGetPath<API> = {
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

export type APIPath<API> = APIGetPath<API> | Extract<keyof API, string>;
