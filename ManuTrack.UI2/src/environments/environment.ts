export const environment = {
  production: false,

  // All requests go through Ocelot Gateway
  gatewayUrl: 'http://localhost:5000',

  // API endpoints — must match Ocelot UpstreamPathTemplates exactly
  api: {
    auth:           'http://localhost:5000/api/v1/auth',
    products:       'http://localhost:5000/api/v1/products',
    bom:            'http://localhost:5000/api/v1/bom',
    workOrders:     'http://localhost:5000/api/v1/workorders',
    tasks:          'http://localhost:5000/api/v1/tasks',
    inventory:      'http://localhost:5000/api/v1/inventory',
    purchaseOrders: 'http://localhost:5000/api/v1/purchase-orders',
    inspections:    'http://localhost:5000/api/v1/inspections',
    defects:        'http://localhost:5000/api/v1/defects',
    compliance:     'http://localhost:5000/api/v1/compliance',
    auditLogs:      'http://localhost:5000/api/v1/audit-logs', // Ocelot rewrites to /audit internally
    analytics:      'http://localhost:5000/api/v1/analytics',
    notifications:  'http://localhost:5000/api/v1/notifications',
  }
};
