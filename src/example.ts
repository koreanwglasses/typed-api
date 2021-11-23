import { TypedAPI } from "./typed-api";

export const baseURL = "http://localhost:4000";

export const routes = {
  connect: "/connect",
} as const;

export type API = {
  [routes.connect]: {
    get: { req: { userId: string; redirect?: string } };
    post: { res: { userId: string } };
  };
};

const { api, fetchAPI } = TypedAPI<API>(baseURL);

api("/connect"); // http://localhost:4000/connect
api("/connect?userId=id"); // http://localhost:4000/connect?userId=id
// api("/connect?redirect=google.com"); // Error
