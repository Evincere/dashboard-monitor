import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing backend connectivity...');
    
    // Probar login directo
    const loginResponse = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    console.log('Login response status:', loginResponse.status);

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('Login error:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `Login failed: ${loginResponse.status}`,
        details: errorText,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const loginData = await loginResponse.json();
    console.log('Login successful, token received');

    // Probar endpoint de inscripciones
    const inscriptionsResponse = await fetch('http://localhost:8080/api/admin/inscriptions?size=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      }
    });

    console.log('Inscriptions response status:', inscriptionsResponse.status);

    if (!inscriptionsResponse.ok) {
      const errorText = await inscriptionsResponse.text();
      console.log('Inscriptions error:', errorText);
    }

    const inscriptionsData = await inscriptionsResponse.json();
    console.log('Inscriptions data received:', Object.keys(inscriptionsData));

    return NextResponse.json({
      success: true,
      message: 'Backend connectivity test successful',
      data: {
        loginSuccessful: !!loginData.token,
        inscriptionsCount: inscriptionsData?.content?.length || 0,
        totalInscriptions: inscriptionsData?.totalElements || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Backend connectivity test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
