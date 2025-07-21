import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { hybridClient, type BackendType } from '../lib/hybrid-client'
import { Settings, Database, Cloud, Zap, Shield, Globe } from 'lucide-react'

interface BackendSwitcherProps {
  onBackendChange?: (backend: BackendType) => void
}

export default function BackendSwitcher({ onBackendChange }: BackendSwitcherProps) {
  const [currentBackend, setCurrentBackend] = useState<BackendType>('blink')
  const [wordpressUrl, setWordpressUrl] = useState('http://localhost:8080')
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  useEffect(() => {
    const backend = hybridClient.getBackend()
    setCurrentBackend(backend)
  }, [])

  const handleBackendSwitch = (backend: BackendType) => {
    setCurrentBackend(backend)
    hybridClient.setBackend(backend)
    onBackendChange?.(backend)
    
    // Store preference in localStorage
    localStorage.setItem('tweetscheduler_backend', backend)
    
    // Reload page to apply changes
    window.location.reload()
  }

  const backendInfo = {
    blink: {
      name: 'Blink SDK',
      description: 'Fast development with built-in auth, database, and AI',
      icon: Zap,
      color: 'bg-blue-500',
      features: [
        'Zero configuration',
        'Built-in authentication',
        'Real-time database',
        'AI capabilities',
        'File storage',
        'Edge functions'
      ],
      pros: [
        'Rapid development',
        'No backend setup required',
        'Automatic scaling',
        'Built-in security'
      ],
      cons: [
        'Less customization',
        'Vendor lock-in',
        'Limited admin control'
      ]
    },
    wordpress: {
      name: 'WordPress API',
      description: 'Full control with WordPress backend and admin dashboard',
      icon: Database,
      color: 'bg-purple-500',
      features: [
        'Full admin dashboard',
        'Custom post types',
        'User management',
        'Plugin ecosystem',
        'SEO optimization',
        'Content management'
      ],
      pros: [
        'Complete control',
        'Rich admin interface',
        'Extensive customization',
        'Large community'
      ],
      cons: [
        'More setup required',
        'Server maintenance',
        'Security management'
      ]
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Backend Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Backend Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentBackend === 'blink' ? 'bg-blue-500' : 'bg-purple-500'}`} />
              <span className="font-medium">
                Currently using: {backendInfo[currentBackend].name}
              </span>
              <Badge variant="secondary">
                {currentBackend === 'blink' ? 'Cloud' : 'Self-hosted'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
            >
              {isConfigOpen ? 'Hide' : 'Configure'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Blink SDK Option */}
          <Card className={`border-2 ${currentBackend === 'blink' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                Blink SDK
                {currentBackend === 'blink' && (
                  <Badge className="bg-blue-500">Active</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {backendInfo.blink.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <ul className="text-sm space-y-1">
                  {backendInfo.blink.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-green-600 mb-1">Pros</h5>
                  <ul className="text-xs space-y-1">
                    {backendInfo.blink.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-orange-600 mb-1">Cons</h5>
                  <ul className="text-xs space-y-1">
                    {backendInfo.blink.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                onClick={() => handleBackendSwitch('blink')}
                disabled={currentBackend === 'blink'}
                className="w-full"
              >
                {currentBackend === 'blink' ? 'Currently Active' : 'Switch to Blink SDK'}
              </Button>
            </CardContent>
          </Card>

          {/* WordPress Option */}
          <Card className={`border-2 ${currentBackend === 'wordpress' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                WordPress API
                {currentBackend === 'wordpress' && (
                  <Badge className="bg-purple-500">Active</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {backendInfo.wordpress.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="wordpress-url">WordPress URL</Label>
                <Input
                  id="wordpress-url"
                  value={wordpressUrl}
                  onChange={(e) => setWordpressUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL where your WordPress installation is running
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <ul className="text-sm space-y-1">
                  {backendInfo.wordpress.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-green-600 mb-1">Pros</h5>
                  <ul className="text-xs space-y-1">
                    {backendInfo.wordpress.pros.map((pro, index) => (
                      <li key={index}>• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-orange-600 mb-1">Cons</h5>
                  <ul className="text-xs space-y-1">
                    {backendInfo.wordpress.cons.map((con, index) => (
                      <li key={index}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Button
                onClick={() => handleBackendSwitch('wordpress')}
                disabled={currentBackend === 'wordpress'}
                className="w-full"
                variant={currentBackend === 'wordpress' ? 'secondary' : 'default'}
              >
                {currentBackend === 'wordpress' ? 'Currently Active' : 'Switch to WordPress'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup Instructions */}
      {isConfigOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentBackend === 'blink' ? (
              <div>
                <h4 className="font-medium mb-2">Blink SDK Setup</h4>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>No additional setup required - Blink SDK is ready to use</li>
                  <li>Authentication, database, and storage are automatically configured</li>
                  <li>Your project ID: <code className="bg-gray-100 px-2 py-1 rounded">wordpress-excel-tweet-scheduler-saas-6ish70bg</code></li>
                  <li>All features work out of the box</li>
                </ol>
              </div>
            ) : (
              <div>
                <h4 className="font-medium mb-2">WordPress Setup</h4>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Install WordPress on your server or local environment</li>
                  <li>Copy the TweetScheduler theme to <code className="bg-gray-100 px-2 py-1 rounded">wp-content/themes/</code></li>
                  <li>Activate the theme from WordPress admin</li>
                  <li>Configure database settings in <code className="bg-gray-100 px-2 py-1 rounded">wp-config.php</code></li>
                  <li>Set up Twitter API credentials in WordPress admin</li>
                  <li>Configure payment gateways for subscriptions</li>
                </ol>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Make sure your WordPress installation is running at the URL specified above.
                    The React frontend will communicate with WordPress via REST API.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Migration Warning */}
      {isConfigOpen && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Shield className="w-5 h-5" />
              Migration Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              Switching backends will require data migration. Existing tweets, users, and settings 
              may need to be transferred manually. Make sure to backup your data before switching.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}