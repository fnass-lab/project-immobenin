import { Tabs } from 'expo-router';
import {
  Home,
  Bot,
  Plus,
  User,
} from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const { profile } = useAuth();
  const isProprietaire = profile?.role === 'proprietaire';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.clay[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.neutral[0],
          borderTopColor: colors.neutral[200],
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant IA',
          tabBarIcon: ({ color, size }) => <Bot size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ajouter"
        options={{
          title: 'Ajouter',
          tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
          // Visible seulement si rôle = propriétaire
          href: isProprietaire ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
