import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const profileDetailField = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'detailFieldForm',
      data: {
        profile: { firstName: 'Ada', lastName: 'Lovelace', bio: 'Mathematician and writer' }
      },
      body: [
        {
          type: 'detail-field',
          name: 'profile',
          label: 'User Profile',
          viewer: [
            {
              type: 'flex',
              direction: 'column',
              gap: 1,
              body: [
                { type: 'text', text: '${profile.firstName} ${profile.lastName}' },
                { type: 'text', text: '${profile.bio}' }
              ]
            }
          ],
          content: [
            { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
            { type: 'input-text', name: 'lastName', label: 'Last Name', required: true },
            { type: 'textarea', name: 'bio', label: 'Bio' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const addressDetailField = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'addressDetailForm',
      data: {
        shipping: { street: '1600 Pennsylvania Ave', city: 'Washington', state: 'DC', zip: '20500' }
      },
      body: [
        {
          type: 'detail-field',
          name: 'shipping',
          label: 'Shipping Address',
          viewer: [
            {
              type: 'flex',
              direction: 'column',
              gap: 1,
              body: [
                { type: 'text', text: '${shipping.street}' },
                { type: 'text', text: '${shipping.city}, ${shipping.state} ${shipping.zip}' }
              ]
            }
          ],
          content: [
            { type: 'input-text', name: 'street', label: 'Street', required: true },
            { type: 'input-text', name: 'city', label: 'City', required: true },
            { type: 'input-text', name: 'state', label: 'State' },
            { type: 'input-text', name: 'zip', label: 'ZIP Code' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save Order', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function DetailFieldLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Opens a dialog form to edit a nested object field. Writes back to the parent form on confirm. The viewer slot controls the preview display; content slot provides the edit form inside the dialog."
      scenarios={[
        {
          title: 'User profile editing via dialog',
          description: 'The viewer slot shows name and bio inline. Click "Edit" to open the dialog, edit the fields, and confirm to write changes back.',
          schema: profileDetailField
        },
        {
          title: 'Shipping address editing via dialog',
          description: 'The viewer slot shows the address on two lines. Click "Edit" to open the dialog with street, city, state, and ZIP fields.',
          schema: addressDetailField
        }
      ]}
    />
  );
}
