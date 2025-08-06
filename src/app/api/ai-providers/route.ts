// src/app/api/ai-providers/route.ts

/**
 * @fileOverview API endpoint for AI provider management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProviderStatus, validateAIConfig } from '@/ai/config';
import { aiProviderManager } from '@/ai/providers/manager';

export async function GET() {
  try {
    const status = getProviderStatus();
    const validation = validateAIConfig();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        validation,
      },
    });
  } catch (error: any) {
    console.error('Error getting AI provider status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get AI provider status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider } = body;
    
    if (action === 'setDefault' && provider) {
      aiProviderManager.setDefaultProvider(provider);
      return NextResponse.json({
        success: true,
        message: `Default provider set to ${provider}`,
      });
    }
    
    if (action === 'test' && provider) {
      try {
        const providerInstance = aiProviderManager.getProvider(provider);
        const testResponse = await providerInstance.generate(
          'Respond with "OK" if you can understand this message.',
          { temperature: 0.1, maxTokens: 10 }
        );
        
        return NextResponse.json({
          success: true,
          message: `Provider ${provider} is working correctly`,
          testResponse: testResponse.text,
        });
      } catch (testError: any) {
        return NextResponse.json({
          success: false,
          error: `Provider ${provider} test failed`,
          details: testError.message,
        });
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action or missing parameters',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in AI provider API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}