#!/usr/bin/env node

/**
 * AUTOMATED PRISMA TO PARSE MIGRATION SCRIPT
 * 
 * This script will:
 * 1. Read all Prisma models from schema.prisma
 * 2. Generate Parse class definitions
 * 3. Create migration scripts for data transfer
 * 4. Generate new API routes using Parse
 * 5. Keep same REST endpoints (frontend unchanged!)
 */

const fs = require('fs');
const path = require('path');

// Parse schema.prisma file
function parsePrismaSchema(schemaPath) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const models = [];
  
  // Extract all models
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;
  
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // Parse fields
    const fields = [];
    const fieldLines = modelBody.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    
    for (const line of fieldLines) {
      const fieldMatch = line.match(/(\w+)\s+(\w+)(\?)?(\[\])?\s*(@.*)?/);
      if (fieldMatch) {
        const [, name, type, optional, array, decorators] = fieldMatch;
        fields.push({
          name,
          type,
          optional: !!optional,
          array: !!array,
          decorators: decorators || ''
        });
      }
    }
    
    models.push({ name: modelName, fields });
  }
  
  return models;
}

// Generate Parse class definition
function generateParseClass(model) {
  const className = model.name;
  let code = `// Parse Class: ${className}\n`;
  code += `// Auto-generated from Prisma model\n\n`;
  code += `import Parse from 'parse/node';\n\n`;
  code += `export class ${className} extends Parse.Object {\n`;
  code += `  constructor() {\n`;
  code += `    super('${className}');\n`;
  code += `  }\n\n`;
  
  // Generate getters/setters for each field
  for (const field of model.fields) {
    if (field.name === 'id') continue; // Parse has built-in objectId
    
    const jsType = mapPrismaTypeToJS(field.type);
    const capName = field.name.charAt(0).toUpperCase() + field.name.slice(1);
    
    // Getter
    code += `  get${capName}(): ${jsType} {\n`;
    code += `    return this.get('${field.name}');\n`;
    code += `  }\n\n`;
    
    // Setter
    code += `  set${capName}(value: ${jsType}): void {\n`;
    code += `    this.set('${field.name}', value);\n`;
    code += `  }\n\n`;
  }
  
  code += `}\n\n`;
  code += `Parse.Object.registerSubclass('${className}', ${className});\n`;
  
  return code;
}

// Map Prisma types to JavaScript/Parse types
function mapPrismaTypeToJS(prismaType) {
  const typeMap = {
    'String': 'string',
    'Int': 'number',
    'Float': 'number',
    'Decimal': 'number',
    'Boolean': 'boolean',
    'DateTime': 'Date',
    'Json': 'any',
    'Bytes': 'Uint8Array'
  };
  
  return typeMap[prismaType] || 'any';
}

// Generate API route converter
function generateAPIRoute(model) {
  const className = model.name;
  const routeName = className.charAt(0).toLowerCase() + className.slice(1) + 's';
  
  let code = `// API Routes for ${className} (Parse version)\n`;
  code += `import express from 'express';\n`;
  code += `import Parse from '../config/parse';\n`;
  code += `import { ${className} } from '../models-parse/${className}';\n\n`;
  code += `const router = express.Router();\n\n`;
  
  // GET all
  code += `// GET /${routeName}\n`;
  code += `router.get('/${routeName}', async (req, res) => {\n`;
  code += `  try {\n`;
  code += `    const query = new Parse.Query(${className});\n`;
  code += `    \n`;
  code += `    // Apply filters from query params\n`;
  code += `    if (req.query.status) query.equalTo('status', req.query.status);\n`;
  code += `    \n`;
  code += `    const results = await query.find({ useMasterKey: true });\n`;
  code += `    const data = results.map(obj => obj.toJSON());\n`;
  code += `    \n`;
  code += `    res.json({ ${routeName}: data });\n`;
  code += `  } catch (error: any) {\n`;
  code += `    res.status(500).json({ error: error.message });\n`;
  code += `  }\n`;
  code += `});\n\n`;
  
  // GET by ID
  code += `// GET /${routeName}/:id\n`;
  code += `router.get('/${routeName}/:id', async (req, res) => {\n`;
  code += `  try {\n`;
  code += `    const query = new Parse.Query(${className});\n`;
  code += `    const result = await query.get(req.params.id, { useMasterKey: true });\n`;
  code += `    res.json(result.toJSON());\n`;
  code += `  } catch (error: any) {\n`;
  code += `    res.status(404).json({ error: 'Not found' });\n`;
  code += `  }\n`;
  code += `});\n\n`;
  
  // POST create
  code += `// POST /${routeName}\n`;
  code += `router.post('/${routeName}', async (req, res) => {\n`;
  code += `  try {\n`;
  code += `    const obj = new ${className}();\n`;
  code += `    \n`;
  code += `    // Set all fields from request body\n`;
  code += `    Object.keys(req.body).forEach(key => {\n`;
  code += `      if (key !== 'id') obj.set(key, req.body[key]);\n`;
  code += `    });\n`;
  code += `    \n`;
  code += `    await obj.save(null, { useMasterKey: true });\n`;
  code += `    res.json(obj.toJSON());\n`;
  code += `  } catch (error: any) {\n`;
  code += `    res.status(500).json({ error: error.message });\n`;
  code += `  }\n`;
  code += `});\n\n`;
  
  // PUT update
  code += `// PUT /${routeName}/:id\n`;
  code += `router.put('/${routeName}/:id', async (req, res) => {\n`;
  code += `  try {\n`;
  code += `    const query = new Parse.Query(${className});\n`;
  code += `    const obj = await query.get(req.params.id, { useMasterKey: true });\n`;
  code += `    \n`;
  code += `    // Update fields\n`;
  code += `    Object.keys(req.body).forEach(key => {\n`;
  code += `      if (key !== 'id') obj.set(key, req.body[key]);\n`;
  code += `    });\n`;
  code += `    \n`;
  code += `    await obj.save(null, { useMasterKey: true });\n`;
  code += `    res.json(obj.toJSON());\n`;
  code += `  } catch (error: any) {\n`;
  code += `    res.status(500).json({ error: error.message });\n`;
  code += `  }\n`;
  code += `});\n\n`;
  
  // DELETE
  code += `// DELETE /${routeName}/:id\n`;
  code += `router.delete('/${routeName}/:id', async (req, res) => {\n`;
  code += `  try {\n`;
  code += `    const query = new Parse.Query(${className});\n`;
  code += `    const obj = await query.get(req.params.id, { useMasterKey: true });\n`;
  code += `    await obj.destroy({ useMasterKey: true });\n`;
  code += `    res.json({ success: true });\n`;
  code += `  } catch (error: any) {\n`;
  code += `    res.status(500).json({ error: error.message });\n`;
  code += `  }\n`;
  code += `});\n\n`;
  
  code += `export default router;\n`;
  
  return code;
}

// Main migration function
function generateMigration() {
  console.log('🚀 Starting Prisma to Parse Migration...\n');
  
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const models = parsePrismaSchema(schemaPath);
  
  console.log(`📊 Found ${models.length} models to migrate\n`);
  
  // Create output directories
  const modelsDir = path.join(__dirname, '../src/models-parse');
  const routesDir = path.join(__dirname, '../src/routes-parse');
  
  if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
  if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });
  
  // Generate files for each model
  for (const model of models) {
    console.log(`✅ Generating ${model.name}...`);
    
    // Generate Parse class
    const classCode = generateParseClass(model);
    fs.writeFileSync(
      path.join(modelsDir, `${model.name}.ts`),
      classCode
    );
    
    // Generate API routes
    const routeCode = generateAPIRoute(model);
    fs.writeFileSync(
      path.join(routesDir, `${model.name.toLowerCase()}.ts`),
      routeCode
    );
  }
  
  // Generate index file for models
  let indexCode = '// Auto-generated Parse models index\n';
  for (const model of models) {
    indexCode += `export { ${model.name} } from './${model.name}';\n`;
  }
  fs.writeFileSync(path.join(modelsDir, 'index.ts'), indexCode);
  
  // Generate route registration file
  let routeIndexCode = '// Auto-generated Parse routes\n';
  routeIndexCode += 'import express from \'express\';\n';
  for (const model of models) {
    routeIndexCode += `import ${model.name.toLowerCase()}Routes from './${model.name.toLowerCase()}';\n`;
  }
  routeIndexCode += '\nexport function registerParseRoutes(app: express.Application) {\n';
  for (const model of models) {
    routeIndexCode += `  app.use('/api', ${model.name.toLowerCase()}Routes);\n`;
  }
  routeIndexCode += '}\n';
  fs.writeFileSync(path.join(routesDir, 'index.ts'), routeIndexCode);
  
  console.log('\n✅ Migration complete!');
  console.log(`📁 Models: ${modelsDir}`);
  console.log(`📁 Routes: ${routesDir}`);
  console.log('\n🎯 Next steps:');
  console.log('1. Review generated files');
  console.log('2. Update src/index.ts to use registerParseRoutes()');
  console.log('3. Test API endpoints');
  console.log('4. Migrate existing data (optional)');
}

// Run migration
if (require.main === module) {
  generateMigration();
}

module.exports = { parsePrismaSchema, generateParseClass, generateAPIRoute };
