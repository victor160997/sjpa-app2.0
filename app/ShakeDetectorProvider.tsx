// ShakeDetectorProvider.tsx
import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { Gyroscope, GyroscopeObject } from 'expo-sensors';
import { Alert } from 'react-native';
import { router } from 'expo-router';

interface ShakeDetectorContextType {
}

interface ShakeDetectorProviderProps {
  children: ReactNode;
}

const ShakeDetectorContext = createContext<ShakeDetectorContextType | undefined>(undefined);

export const useShakeDetector = (): ShakeDetectorContextType => {
  const context = useContext(ShakeDetectorContext);
  if (!context) {
    throw new Error('useShakeDetector deve ser usado dentro de ShakeDetectorProvider');
  }
  return context;
};

export const ShakeDetectorProvider: React.FC<ShakeDetectorProviderProps> = ({ children }) => {
  const shakeCountRef = useRef<number>(0);
  const lastShakeTimeRef = useRef<number>(0);
  const shakeTimeout: number = 2000;

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;

    const startDetection = async (): Promise<void> => {
      try {
        
        const isAvailable = await Gyroscope.isAvailableAsync();
        if (!isAvailable) {
          console.warn('Giroscópio não disponível neste dispositivo');
          return;
        }

        Gyroscope.setUpdateInterval(100);
        
        subscription = Gyroscope.addListener((gyroscopeData: GyroscopeObject) => {
          detectShake(gyroscopeData);
        });
      } catch (error) {
        console.error('Erro ao inicializar detector de balançada:', error);
      }
    };

    startDetection();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const detectShake = (gyro: GyroscopeObject): void => {
    const SHAKE_THRESHOLD: number = 3;
    const now: number = Date.now();
    
    const magnitude: number = Math.sqrt(gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z);
    
    if (magnitude > SHAKE_THRESHOLD) {
      const timeSinceLastShake: number = now - lastShakeTimeRef.current;
      
      if (timeSinceLastShake < shakeTimeout) {
        shakeCountRef.current += 1;
      } else {
        shakeCountRef.current = 1;
      }
      
      lastShakeTimeRef.current = now;
      
      console.log(`Balançada detectada! Count: ${shakeCountRef.current}`);
      
      if (shakeCountRef.current >= 3) {
        handleThreeShakes();
        shakeCountRef.current = 0;
      }
    }
  };

  const handleThreeShakes = (): void => {
    Alert.alert(
      'Página Secreta Desbloqueada!', 
      'Três balançadas detectadas! Redirecionando...',
      [
        {
          text: 'Ir para página secreta',
          onPress: () => {
            
            router.push('/(tabs)/resgate/resgate');
          }
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ]
    );
  };

  const contextValue: ShakeDetectorContextType = {};

  return (
    <ShakeDetectorContext.Provider value={contextValue}>
      {children}
    </ShakeDetectorContext.Provider>
  );
};