export const environment = {
  production: true,

  // Production Ocelot Gateway URL
  gatewayUrl: 'https://api.manutrack.com',

  api: {
    auth:           'https://api.manutrack.com/api/v1/auth',
    products:       'https://api.manutrack.com/api/v1/products',
    bom:            'https://api.manutrack.com/api/v1/bom',
    workOrders:     'https://api.manutrack.com/api/v1/workorders',
    tasks:          'https://api.manutrack.com/api/v1/tasks',
    inventory:      'https://api.manutrack.com/api/v1/inventory',
    suppliers:      'https://api.manutrack.com/api/v1/suppliers',
    locations:      'https://api.manutrack.com/api/v1/locations',
    purchaseOrders: 'https://api.manutrack.com/api/v1/purchase-orders',
    inspections:    'https://api.manutrack.com/api/v1/inspections',
    defects:        'https://api.manutrack.com/api/v1/defects',
    compliance:     'https://api.manutrack.com/api/v1/compliance',
    auditLogs:      'https://api.manutrack.com/api/v1/audit-logs',
    analytics:      'https://api.manutrack.com/api/v1/analytics',
    notifications:  'https://api.manutrack.com/api/v1/notifications',
  }
};
