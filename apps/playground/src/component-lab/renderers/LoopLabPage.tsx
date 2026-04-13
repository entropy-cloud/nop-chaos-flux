import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const userLoop = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${items}',
      itemName: 'item',
      indexName: 'idx',
      body: [
        { type: 'text', text: '${idx + 1}. ${item.name} — ${item.role}' }
      ]
    }
  ]
};

const productLoop = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${products}',
      itemName: 'product',
      indexName: 'i',
      body: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          className: 'border rounded-lg p-3 mb-2',
          body: [
            {
              type: 'flex',
              direction: 'row',
              align: 'center',
              gap: 2,
              body: [
                { type: 'icon', icon: 'Package', size: 16 },
                { type: 'text', text: '${product.name}' }
              ]
            },
            {
              type: 'flex',
              direction: 'row',
              gap: 2,
              body: [
                { type: 'badge', label: '${product.category}', variant: 'secondary' },
                { type: 'text', text: '$${product.price}' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export function LoopLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Iterates over an array and renders each item via a body region. Exposes itemName, indexName, and keyName bindings into each item's scope."
      scenarios={[
        {
          title: 'Loop over a user list',
          description: 'Each item is rendered as a text line using the item and index bindings.',
          schema: userLoop,
          data: {
            items: [
              { name: 'Alice', role: 'Admin' },
              { name: 'Bob', role: 'Editor' },
              { name: 'Carol', role: 'Viewer' }
            ]
          }
        },
        {
          title: 'Loop over products — card row with icon, badge, and price',
          description: 'Each product renders as a flex row with an icon, name, category badge, and price. Demonstrates rich per-item templates.',
          schema: productLoop,
          data: {
            products: [
              { name: 'Wireless Headphones', category: 'Electronics', price: 89.99 },
              { name: 'Ergonomic Chair', category: 'Furniture', price: 349.00 },
              { name: 'Mechanical Keyboard', category: 'Electronics', price: 129.50 },
              { name: 'Standing Desk', category: 'Furniture', price: 499.00 }
            ]
          }
        }
      ]}
    />
  );
}
