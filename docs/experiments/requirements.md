有一些特殊的要求：

1. 必须符合flux-design-principles.md要求
2. 对于flux的现有设计的原因，参见 flux-dsl-vm-extensibility.md
3. 实际使用时flux可能是嵌入式使用，也就是在一个庞大的react系统中，router路由到一个页面时，它根据url动态加载json schema，然后渲染得到局部页面。也可以是直接指定json结构，然后渲染得到局部页面。不同的局部页面不直接交互，通过RendererEnv来实现外部环境适配。

4. RenderEnv是静态的，不会变化，能直接使用这里的能力的必须直接使用，不要再内部facade。
