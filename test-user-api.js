// test-user-api.js - Simple test script to verify user API functionality
const testUserAPI = async () => {
  const baseUrl = 'http://localhost:9002';
  
  console.log('🧪 Testing User Management API...\n');

  try {
    // Test 1: Get users list
    console.log('1. Testing GET /api/users...');
    const usersResponse = await fetch(`${baseUrl}/api/users?limit=5`);
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ Users fetched successfully');
      console.log(`   Found ${usersData.users?.length || 0} users`);
      console.log(`   Total: ${usersData.pagination?.total || 0}`);
    } else {
      console.log('❌ Failed to fetch users:', usersResponse.status);
    }

    // Test 2: Get user statistics
    console.log('\n2. Testing GET /api/dashboard/users (stats)...');
    const statsResponse = await fetch(`${baseUrl}/api/dashboard/users?stats=true`);
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ User statistics fetched successfully');
      console.log(`   Total users: ${statsData.total || 0}`);
      console.log(`   Active users: ${statsData.active || 0}`);
    } else {
      console.log('❌ Failed to fetch user statistics:', statsResponse.status);
    }

    // Test 3: Search users
    console.log('\n3. Testing user search...');
    const searchResponse = await fetch(`${baseUrl}/api/users?search=admin&limit=3`);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('✅ User search completed');
      console.log(`   Found ${searchData.users?.length || 0} matching users`);
    } else {
      console.log('❌ Failed to search users:', searchResponse.status);
    }

    // Test 4: Filter by role
    console.log('\n4. Testing role filter...');
    const roleResponse = await fetch(`${baseUrl}/api/users?role=ROLE_ADMIN&limit=3`);
    if (roleResponse.ok) {
      const roleData = await roleResponse.json();
      console.log('✅ Role filter completed');
      console.log(`   Found ${roleData.users?.length || 0} admin users`);
    } else {
      console.log('❌ Failed to filter by role:', roleResponse.status);
    }

    console.log('\n🎉 User API tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n💡 Make sure the development server is running on port 9002');
    console.log('   Run: npm run dev');
  }
};

// Run the test if this file is executed directly
if (require.main === module) {
  testUserAPI();
}

module.exports = { testUserAPI };