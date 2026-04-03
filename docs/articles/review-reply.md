`id` 是当前page内部的唯一绝对坐标（但不要求是全局页面的），这个设计是要保留的，name可能重复，id在page内原则上不应该重复。 `component:myForm`”的描述确实不正确，这个表述要删除。 _cid是内部实现机制，不用在设计文档中强调，最多提一句优化处理。



修正 `useScopeSelector` 的语义，使其真正反映词法作用域链，这个是否会影响性能。
以下做法是否可行？
readOwn()返回的是当前scopeVars, 其中包含一个变量_parentVars指向parentScope的ownedVars, 当parent变化，或者parent的parent变化时，它会自动改变，这样也就自然影响到下游。
下游具体使用时，在通过限制访问局部变量，即使scopeVars变化，但是自己用的部分没有变化，则局部也不会变化。比如input-text等都只需要一个value，根据name获取。


直接修改schema节点也不是很大的问题，如果对性能有好处，也可以使用。如果CompiledSchemaNode已经必然存在，则cid可以放到CompiledSchemaNode对象上。

env应该是全局静态的对象，它提供外部运行环境抽象，本身应该是不会改变的。但是env改变的时候确实运行时状态不应该丢失。

