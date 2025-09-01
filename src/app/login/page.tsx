'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { routeUrl } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const success = await login(formData)
      
      if (success) {
        router.push(routeUrl(''))
        router.refresh()
      } else {
        setError('Invalid credentials or access denied')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">MPD Dashboard</h1>
          <p className="text-muted-foreground mt-2">Sistema de administración de concursos</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingresa tus credenciales de administrador</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Usuario</label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Ingresa tu usuario"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Ministerio Público de la Defensa</p>
          <p className="mt-1">Sistema interno - Solo para administradores</p>
        </div>
      </div>
    </div>
  )
}
