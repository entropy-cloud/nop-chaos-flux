这个项目的核心设计思想包含如下几个部分:

1. 面向DSL
一种同时支持XML和JSON两种表示形式的DSL。
<node attr="a">b</node> 对应于 { type:"node", attr:"a", body:"b" }

所有前端结构都能用Tree结构表达，所以必然可以用这个DSL形式来表达，只是引入不同的type而已。

每个type对应一个RendererDefinition，它相当于是可分解的局部的元数据数据标准，相当于是一种标准协议规定。同时这里还要有一定的预处理功能，比如对于传入的json进行某种属性规范化后再返回？真正编译的是规范化后的json？ 

2. 引入scope抽象，区分actionScopeTree/dataScopeTree/componentTree

{type:"input-text", name:"xx"} 组件通过name获取和设置值，name会自动创建scope中的一个数据变量。

Form/Page/Table/Dialog等少数控件会建立新的scope

为了保持DSL的简洁，真正的纯代码要抽象到外部的js库中，通过xui:imports引入，然后通过action:"demo:myFunc"这种形式去触发调用。函数库中无状态，相当于是纯函数，状态完全由dataScope来维护，而dataScope的构建是通过组件tree自动构建。

引入data-source， 相当于是在dataScope中引入某种动态变量更新能力。

3. action抽象
实际上可以做到某种DAG执行能力，只是缺省情况下可以简化。通过parallel，sequential，then等扩展都可以正确处理各种情况。（这里在设计上一个可探讨的问题是是否需要引入then, 还是说sequential就足够，另外如果报错如何执行，是否需要引入另外一个分支）

reaction连接了dataScope的变化和action。

4. RenderEnv抽象
隔离输入输出，使得renderer成为某种纯函数，这一点在article中有描述。

5. Expression抽象
通过表达式 ${expr} 从数据scope中拉取数据到component中。可以通过预编译来优化。另外这里可以引入响应式语义，规定expr所依赖的内容变化，这个部分就可以重新执行。但是否自动执行可能有一些语义上的限制。比如form的initApi/api， 
initApi是page/dialog显示出来的时候自动执行一次，api是form提交的时候执行（这里需要一个系统化的规范来规定这个属性是如何自动执行的，是否在RendererDefinition中定义）。

6. componentId/componentName
用于定位组件，触发组件上的方法。组件上的方法本身是否自动放到actionScope上，支持action触发？

7. Form抽象
每个字段都要error/hint/label等支持，需要FieldFrame抽象
验证提交等逻辑需要完整支持，通过FormStore实现

8. 可逆计算
整体设计思想与传统的基于plugin/组件的抽象不同，不是预制少数扩展点接口，而是整体进行模型化，然后模型用文本DSL表达，在通用的结构层统一解决问题。当前项目一个非常重要的目标是提供通用的设计器的设计器，可以基于它快速定制各种流程设计器，报表设计器等，不是一个按照固定需求实现的多个分离的设计器，而是统一考虑的一个元设计器，补充不同的DSL定制就可以得到不同的设计器。参考c:/can/nop/nop-entropy/theory/amis下的文章