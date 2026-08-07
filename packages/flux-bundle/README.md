# @nop-chaos/flux

Host-facing Flux facade package for schema rendering.

`registerDefaultFluxRenderers` registers the default 6 renderer families: basic, form, form-advanced, data, content, layout. The mobile, scheduling, ai, and graph families are registered on demand by hosts via their own `register*Renderers` entry points.
