# Independent CI and coordinated release

Each PR must be buildable and testable from **its own commit**. Never couple ordinary SDK CI to the current default branch of another repository. A remote moving branch is not immutable evidence.

SDK CI tests the local, pinned operation index and client behaviors without network/credentials. At coordinated release time, the release authority compares pinned Engine contract SHA, SDK, Cookbook, CLI and public docs in one immutable release bundle. Divergence blocks *release*, not the independent developer pull-request test.

The cross-repository release gate is not yet fully installed, so GA and registry publication remain blocked. No claim of live automated provisioning is made.
