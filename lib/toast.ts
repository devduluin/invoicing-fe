/** react-hot-toast with one rule on top: the same message never stacks. A text toast gets the text
 *  itself as its id (unless the caller passes one), so showing it again while it is still on screen
 *  refreshes that toast instead of adding a second — e.g. a load effect that runs twice (React
 *  StrictMode in dev, a dependency changing) no longer shows "Duplicated from …" twice.
 *  Import this instead of react-hot-toast's default export. */
import base from "react-hot-toast";

type Message = Parameters<typeof base.success>[0];
type Options = Parameters<typeof base.success>[1];

const once = (message: Message, opts?: Options): Options =>
  typeof message === "string" && !opts?.id ? { ...opts, id: message } : opts;

const toast = Object.assign((message: Message, opts?: Options) => base(message, once(message, opts)), base, {
  success: (message: Message, opts?: Options) => base.success(message, once(message, opts)),
  error: (message: Message, opts?: Options) => base.error(message, once(message, opts)),
  loading: (message: Message, opts?: Options) => base.loading(message, once(message, opts)),
});

export default toast;
