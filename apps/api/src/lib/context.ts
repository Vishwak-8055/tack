/** Who is doing this, and from which browser tab (so that tab can ignore its own realtime echo). */
export interface Ctx {
  userId: string;
  clientId: string | null;
}
