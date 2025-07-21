/**
 * Hybrid Client - Switches between Blink SDK and WordPress API
 */

import { createClient } from '@blinkdotnew/sdk';

// Configuration
interface BackendConfig {
  type: 'blink' | 'wordpress';
  blink?: {
    projectId: string;
    authRequired: boolean;
  };
  wordpress?: {
    apiUrl: string;
    baseUrl: string;
    token?: string;
    nonce?: string;
  };
}

// Default configuration
const config: BackendConfig = {
  type: 'blink',
  blink: {
    projectId: 'wordpress-excel-tweet-scheduler-saas-6ish70bg',
    authRequired: true,
  },
  wordpress: {
    apiUrl: 'https://yoursite.com/wp-json/tweetscheduler/v1',
    baseUrl: 'https://yoursite.com',
  },
};

// Initialize clients
let blinkClient: any = null;
let wordpressConfig: any = null;

// Initialize Blink client
function initBlinkClient() {
  if (!blinkClient && config.blink) {
    blinkClient = createClient({
      projectId: config.blink.projectId,
      authRequired: config.blink.authRequired,
    });
  }
  return blinkClient;
}

// Initialize WordPress config
function initWordPressConfig() {
  if (!wordpressConfig && config.wordpress) {
    wordpressConfig = config.wordpress;
    
    // Try to get WordPress data from global window object
    if (typeof window !== 'undefined' && (window as any).tweetschedulerWordPress) {
      const wpData = (window as any).tweetschedulerWordPress;
      wordpressConfig.apiUrl = wpData.apiUrl;
      wordpressConfig.baseUrl = wpData.homeUrl;
      wordpressConfig.nonce = wpData.nonce;
      wordpressConfig.token = wpData.currentUser?.token;
    }
  }
  return wordpressConfig;
}

// WordPress API implementation
const wordpressApi = {
  auth: {
    me: async () => {
      const wpConfig = initWordPressConfig();
      const response = await fetch(`${wpConfig.apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${wpConfig.token}`,
          'X-WP-Nonce': wpConfig.nonce,
        },
      });
      if (!response.ok) throw new Error('Failed to get user');
      return response.json();
    },
    
    login: (nextUrl?: string) => {
      const wpConfig = initWordPressConfig();
      window.location.href = `${wpConfig.baseUrl}/wp-login.php${nextUrl ? `?redirect_to=${encodeURIComponent(nextUrl)}` : ''}`;
    },
    
    logout: (redirectUrl?: string) => {
      const wpConfig = initWordPressConfig();
      window.location.href = `${wpConfig.baseUrl}/wp-login.php?action=logout${redirectUrl ? `&redirect_to=${encodeURIComponent(redirectUrl)}` : ''}`;
    },
    
    onAuthStateChanged: (callback: (state: any) => void) => {
      // WordPress doesn't have real-time auth state changes
      const checkAuth = async () => {
        try {
          const user = await wordpressApi.auth.me();
          callback({ user, isLoading: false, isAuthenticated: true });
        } catch {
          callback({ user: null, isLoading: false, isAuthenticated: false });
        }
      };
      
      checkAuth();
      return () => {}; // No cleanup needed
    },
  },
  
  db: {
    tweets: {
      list: async (options?: any) => {
        const wpConfig = initWordPressConfig();
        const params = new URLSearchParams();
        if (options?.where?.userId) params.append('user_id', options.where.userId);
        if (options?.limit) params.append('per_page', options.limit.toString());
        
        const response = await fetch(`${wpConfig.apiUrl}/tweets?${params}`, {
          headers: {
            'Authorization': `Bearer ${wpConfig.token}`,
            'X-WP-Nonce': wpConfig.nonce,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch tweets');
        const data = await response.json();
        return data.tweets || [];
      },
      
      create: async (tweet: any) => {
        const wpConfig = initWordPressConfig();
        const response = await fetch(`${wpConfig.apiUrl}/tweets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wpConfig.token}`,
            'X-WP-Nonce': wpConfig.nonce,
          },
          body: JSON.stringify(tweet),
        });
        if (!response.ok) throw new Error('Failed to create tweet');
        return response.json();
      },
      
      update: async (id: string, updates: any) => {
        const wpConfig = initWordPressConfig();
        const response = await fetch(`${wpConfig.apiUrl}/tweets/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wpConfig.token}`,
            'X-WP-Nonce': wpConfig.nonce,
          },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Failed to update tweet');
        return response.json();
      },
      
      delete: async (id: string) => {
        const wpConfig = initWordPressConfig();
        const response = await fetch(`${wpConfig.apiUrl}/tweets/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${wpConfig.token}`,
            'X-WP-Nonce': wpConfig.nonce,
          },
        });
        if (!response.ok) throw new Error('Failed to delete tweet');
        return response.json();
      },
      
      createMany: async (tweets: any[]) => {
        const wpConfig = initWordPressConfig();
        const response = await fetch(`${wpConfig.apiUrl}/tweets/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${wpConfig.token}`,
            'X-WP-Nonce': wpConfig.nonce,
          },
          body: JSON.stringify({ tweets }),
        });
        if (!response.ok) throw new Error('Failed to create tweets');
        return response.json();
      },
    },
    
    subscriptions: {
      list: async () => {
        const wpConfig = initWordPressConfig();
        const response = await fetch(`${wpConfig.apiUrl}/subscription`, {
          headers: {
            'Authorization': `Bearer ${wpConfig.token}`,
            'X-WP-Nonce': wpConfig.nonce,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch subscription');
        return response.json();
      },
    },
  },
  
  storage: {
    upload: async (file: File, path: string, options?: any) => {
      const wpConfig = initWordPressConfig();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      
      const response = await fetch(`${wpConfig.apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wpConfig.token}`,
          'X-WP-Nonce': wpConfig.nonce,
        },
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload file');
      const data = await response.json();
      return { publicUrl: data.file_url };
    },
  },
  
  data: {
    extractFromUrl: async (url: string, options?: any) => {
      throw new Error('Data extraction not available in WordPress backend');
    },
    
    fetch: async (options: any) => {
      throw new Error('Secure API proxy not available in WordPress backend');
    },
  },
  
  ai: {
    generateText: async (options: any) => {
      throw new Error('AI features not available in WordPress backend');
    },
    
    streamText: async (options: any, callback: any) => {
      throw new Error('AI streaming not available in WordPress backend');
    },
  },
  
  analytics: {
    log: async (event: string, data?: any) => {
      const wpConfig = initWordPressConfig();
      const response = await fetch(`${wpConfig.apiUrl}/analytics/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wpConfig.token}`,
          'X-WP-Nonce': wpConfig.nonce,
        },
        body: JSON.stringify({ event_type: event, event_data: data }),
      });
      return response.ok;
    },
  },
};

// Hybrid client that switches between backends
export const hybridClient = {
  // Configuration methods
  setBackend: (type: 'blink' | 'wordpress') => {
    config.type = type;
    localStorage.setItem('tweetscheduler_backend', type);
  },
  
  getBackend: () => {
    const stored = localStorage.getItem('tweetscheduler_backend');
    if (stored && (stored === 'blink' || stored === 'wordpress')) {
      config.type = stored;
    }
    return config.type;
  },
  
  setWordPressConfig: (wpConfig: any) => {
    config.wordpress = { ...config.wordpress, ...wpConfig };
  },
  
  // Auth methods
  auth: {
    me: async () => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.auth.me();
      } else {
        return wordpressApi.auth.me();
      }
    },
    
    login: (nextUrl?: string) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.auth.login(nextUrl);
      } else {
        return wordpressApi.auth.login(nextUrl);
      }
    },
    
    logout: (redirectUrl?: string) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.auth.logout(redirectUrl);
      } else {
        return wordpressApi.auth.logout(redirectUrl);
      }
    },
    
    onAuthStateChanged: (callback: (state: any) => void) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.auth.onAuthStateChanged(callback);
      } else {
        return wordpressApi.auth.onAuthStateChanged(callback);
      }
    },
  },
  
  // Database methods
  db: {
    tweets: {
      list: async (options?: any) => {
        if (config.type === 'blink') {
          const client = initBlinkClient();
          return client.db.tweets.list(options);
        } else {
          return wordpressApi.db.tweets.list(options);
        }
      },
      
      create: async (tweet: any) => {
        if (config.type === 'blink') {
          const client = initBlinkClient();
          return client.db.tweets.create(tweet);
        } else {
          return wordpressApi.db.tweets.create(tweet);
        }
      },
      
      update: async (id: string, updates: any) => {
        if (config.type === 'blink') {
          const client = initBlinkClient();
          return client.db.tweets.update(id, updates);
        } else {
          return wordpressApi.db.tweets.update(id, updates);
        }
      },
      
      delete: async (id: string) => {
        if (config.type === 'blink') {
          const client = initBlinkClient();
          return client.db.tweets.delete(id);
        } else {
          return wordpressApi.db.tweets.delete(id);
        }
      },
      
      createMany: async (tweets: any[]) => {
        if (config.type === 'blink') {
          const client = initBlinkClient();
          return client.db.tweets.createMany(tweets);
        } else {
          return wordpressApi.db.tweets.createMany(tweets);
        }
      },
    },
    
    subscriptions: {
      list: async () => {
        if (config.type === 'blink') {
          const client = initBlinkClient();
          // Blink doesn't have subscriptions, return mock data
          return {
            plan_type: 'pro',
            status: 'active',
            tweets_used: 0,
            tweets_limit: 120,
          };
        } else {
          return wordpressApi.db.subscriptions.list();
        }
      },
    },
  },
  
  // Storage methods
  storage: {
    upload: async (file: File, path: string, options?: any) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.storage.upload(file, path, options);
      } else {
        return wordpressApi.storage.upload(file, path, options);
      }
    },
  },
  
  // Data methods
  data: {
    extractFromUrl: async (url: string, options?: any) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.data.extractFromUrl(url, options);
      } else {
        return wordpressApi.data.extractFromUrl(url, options);
      }
    },
    
    fetch: async (options: any) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.data.fetch(options);
      } else {
        return wordpressApi.data.fetch(options);
      }
    },
  },
  
  // AI methods
  ai: {
    generateText: async (options: any) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.ai.generateText(options);
      } else {
        return wordpressApi.ai.generateText(options);
      }
    },
    
    streamText: async (options: any, callback: any) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.ai.streamText(options, callback);
      } else {
        return wordpressApi.ai.streamText(options, callback);
      }
    },
  },
  
  // Analytics methods
  analytics: {
    log: async (event: string, data?: any) => {
      if (config.type === 'blink') {
        const client = initBlinkClient();
        return client.analytics.log(event, data);
      } else {
        return wordpressApi.analytics.log(event, data);
      }
    },
  },
  
  // Utility methods
  getFeatures: () => {
    if (config.type === 'blink') {
      return {
        auth: true,
        database: true,
        storage: true,
        ai: true,
        dataExtraction: true,
        secureApiProxy: true,
        analytics: true,
        realtime: true,
        notifications: true,
      };
    } else {
      return {
        auth: true,
        database: true,
        storage: true,
        ai: false,
        dataExtraction: false,
        secureApiProxy: false,
        analytics: true,
        realtime: false,
        notifications: false,
        paymentGateways: true,
        subscriptionManagement: true,
        adminDashboard: true,
        customization: true,
      };
    }
  },
  
  getBackendInfo: () => {
    return {
      current: config.type,
      blink: {
        name: 'Blink SDK',
        description: 'Fast development with zero configuration',
        features: [
          'Built-in authentication',
          'Real-time database',
          'AI capabilities',
          'Data extraction',
          'Secure API proxy',
          'Analytics',
          'Real-time features',
          'Email notifications',
        ],
      },
      wordpress: {
        name: 'WordPress API',
        description: 'Full control with rich admin interface',
        features: [
          'WordPress admin dashboard',
          'User management',
          'Subscription management',
          'Payment gateways',
          'Custom post types',
          'Theme customization',
          'Plugin ecosystem',
          'SEO optimization',
        ],
      },
    };
  },
};

// Initialize backend from localStorage
hybridClient.getBackend();