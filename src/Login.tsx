import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Globe2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function Login() {
  const { loginWithEmail, signupWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, name);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Globe2 className="w-12 h-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Global CRM</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to manage leads and customers' : 'Create an account to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mb-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="John Doe" 
                  required 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="yours@example.com" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            <Button className="w-full" type="submit">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-neutral-100 p-4">
           <p className="text-sm text-center text-muted-foreground">
             {isLogin ? "Don't have an account? " : "Already have an account? "}
             <button 
               type="button"
               className="text-blue-600 hover:underline font-medium"
               onClick={() => setIsLogin(!isLogin)}
             >
               {isLogin ? 'Sign up' : 'Sign in'}
             </button>
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}
