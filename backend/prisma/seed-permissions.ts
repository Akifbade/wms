import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define all resources and actions
const RESOURCES = [
  'SHIPMENTS',
  'RACKS',
  'INVOICES',
  'PAYMENTS',
  'EXPENSES',
  'MOVING_JOBS',
  'USERS',
  'SETTINGS',
  'REPORTS',
  'DASHBOARD',
  'CUSTOM_FIELDS',
  'BILLING'
];

const ACTIONS = [
  'VIEW',
  'CREATE',
  'EDIT',
  'DELETE',
  'APPROVE',
  'EXPORT',
  'MANAGE'
];

// Define default permissions for each role
const ROLE_PERMISSIONS = {
  ADMIN: [
    // Full access to everything
    ...RESOURCES.flatMap(resource => 
      ACTIONS.map(action => ({ resource, action }))
    )
  ],
  MANAGER: [
    // Shipments - Full operational control
    { resource: 'SHIPMENTS', action: 'VIEW' },
    { resource: 'SHIPMENTS', action: 'CREATE' },
    { resource: 'SHIPMENTS', action: 'EDIT' },
    { resource: 'SHIPMENTS', action: 'DELETE' },
    { resource: 'SHIPMENTS', action: 'EXPORT' },
    
    // Racks - View and manage
    { resource: 'RACKS', action: 'VIEW' },
    { resource: 'RACKS', action: 'CREATE' },
    { resource: 'RACKS', action: 'EDIT' },
    { resource: 'RACKS', action: 'EXPORT' },
    
    // Invoices - Full control
    { resource: 'INVOICES', action: 'VIEW' },
    { resource: 'INVOICES', action: 'CREATE' },
    { resource: 'INVOICES', action: 'EDIT' },
    { resource: 'INVOICES', action: 'EXPORT' },
    
    // Payments - View and record
    { resource: 'PAYMENTS', action: 'VIEW' },
    { resource: 'PAYMENTS', action: 'CREATE' },
    { resource: 'PAYMENTS', action: 'EDIT' },
    
    // Expenses - View and approve
    { resource: 'EXPENSES', action: 'VIEW' },
    { resource: 'EXPENSES', action: 'CREATE' },
    { resource: 'EXPENSES', action: 'EDIT' },
    { resource: 'EXPENSES', action: 'APPROVE' },
    
    // Moving Jobs - Full control
    { resource: 'MOVING_JOBS', action: 'VIEW' },
    { resource: 'MOVING_JOBS', action: 'CREATE' },
    { resource: 'MOVING_JOBS', action: 'EDIT' },
    { resource: 'MOVING_JOBS', action: 'DELETE' },
    
    // Users - View only
    { resource: 'USERS', action: 'VIEW' },
    
    // Settings - View only
    { resource: 'SETTINGS', action: 'VIEW' },
    
    // Reports - View and export
    { resource: 'REPORTS', action: 'VIEW' },
    { resource: 'REPORTS', action: 'EXPORT' },
    
    // Dashboard - View
    { resource: 'DASHBOARD', action: 'VIEW' }
  ],
  WORKER: [
    // Shipments - Limited access
    { resource: 'SHIPMENTS', action: 'VIEW' },
    { resource: 'SHIPMENTS', action: 'CREATE' },
    { resource: 'SHIPMENTS', action: 'EDIT' },
    
    // Racks - View only
    { resource: 'RACKS', action: 'VIEW' },
    
    // Invoices - View only
    { resource: 'INVOICES', action: 'VIEW' },
    
    // Moving Jobs - View and edit assigned
    { resource: 'MOVING_JOBS', action: 'VIEW' },
    { resource: 'MOVING_JOBS', action: 'EDIT' },
    
    // Expenses - Create own expenses
    { resource: 'EXPENSES', action: 'CREATE' },
    { resource: 'EXPENSES', action: 'VIEW' },
    
    // Dashboard - View
    { resource: 'DASHBOARD', action: 'VIEW' }
  ]
};

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  try {
    // 1. Create all permissions (resource + action combinations)
    console.log('\n📝 Creating permissions...');
    const permissionMap = new Map<string, string>();
    
    for (const resource of RESOURCES) {
      for (const action of ACTIONS) {
        const permission = await prisma.permission.upsert({
          where: {
            resource_action: {
              resource,
              action
            }
          },
          update: {},
          create: {
            resource,
            action,
            description: `${action} access to ${resource}`
          }
        });
        
        permissionMap.set(`${resource}:${action}`, permission.id);
        console.log(`  ✓ ${resource}:${action}`);
      }
    }

    console.log(`\n✅ Created ${permissionMap.size} permissions`);

    // 2. Get all companies
    const companies = await prisma.company.findMany();
    
    if (companies.length === 0) {
      console.log('\n⚠️  No companies found. Skipping role permission assignment.');
      console.log('   Role permissions will be created when companies are added.');
      return;
    }

    console.log(`\n👥 Found ${companies.length} company(ies)`);

    // 3. Assign default permissions for each role in each company
    for (const company of companies) {
      console.log(`\n🏢 Setting up permissions for: ${company.name}`);
      
      for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        console.log(`\n  🎭 Role: ${role}`);
        let count = 0;
        
        for (const { resource, action } of permissions) {
          const permissionId = permissionMap.get(`${resource}:${action}`);
          
          if (!permissionId) {
            console.warn(`    ⚠️  Permission not found: ${resource}:${action}`);
            continue;
          }

          await prisma.rolePermission.upsert({
            where: {
              role_permissionId_companyId: {
                role,
                permissionId,
                companyId: company.id
              }
            },
            update: {},
            create: {
              role,
              permissionId,
              companyId: company.id
            }
          });
          
          count++;
        }
        
        console.log(`    ✓ Assigned ${count} permissions to ${role}`);
      }
    }

    console.log('\n✅ Permission seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Total Permissions: ${permissionMap.size}`);
    console.log(`   • Companies: ${companies.length}`);
    console.log(`   • Roles: ${Object.keys(ROLE_PERMISSIONS).length}`);
    console.log(`   • ADMIN: Full access (${ROLE_PERMISSIONS.ADMIN.length} permissions)`);
    console.log(`   • MANAGER: ${ROLE_PERMISSIONS.MANAGER.length} permissions`);
    console.log(`   • WORKER: ${ROLE_PERMISSIONS.WORKER.length} permissions`);

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

// Run the seed function
seedPermissions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
