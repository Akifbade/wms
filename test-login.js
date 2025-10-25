// Quick login test
async function testLogin() {
  const email = 'admin@wms.com';
  const password = 'admin123';
  
  console.log('🧪 Testing login...');
  console.log('Email:', email);
  console.log('Password:', password);
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('Token:', data.token.substring(0, 20) + '...');
      console.log('User:', data.user.name, `(${data.user.role})`);
      console.log('Company:', data.user.company.name);
    } else {
      console.log('\n❌ LOGIN FAILED!');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
