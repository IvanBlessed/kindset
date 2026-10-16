import { Mark } from '@/brand/Logo';

/** Shown when the Telegram client is too old to run Mini Apps. */
export function EnvUnsupported() {
  return (
    <div className="ks-center">
      <Mark size={96} />
      <h1 className="ks-profile__name">kindset</h1>
      <p className="ks-muted">Please update Telegram to open Kindset.</p>
    </div>
  );
}
