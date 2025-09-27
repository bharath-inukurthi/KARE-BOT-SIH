import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VisitorContext = createContext();

export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (!context) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  return context;
};

export const VisitorProvider = ({ children }) => {
  const [isVisitor, setIsVisitor] = useState(false);

  useEffect(() => {
    // Load visitor state from AsyncStorage on mount
    const loadVisitorState = async () => {
      try {
        const visitorState = await AsyncStorage.getItem('isVisitor');
        if (visitorState !== null) {
          setIsVisitor(JSON.parse(visitorState));
        }
      } catch (error) {
        console.error('Error loading visitor state:', error);
      }
    };

    loadVisitorState();
  }, []);

  const setVisitorMode = async (visitorStatus) => {
    try {
      setIsVisitor(visitorStatus);
      await AsyncStorage.setItem('isVisitor', JSON.stringify(visitorStatus));
    } catch (error) {
      console.error('Error saving visitor state:', error);
    }
  };

  const clearVisitorMode = async () => {
    try {
      setIsVisitor(false);
      await AsyncStorage.removeItem('isVisitor');
    } catch (error) {
      console.error('Error clearing visitor state:', error);
    }
  };

  return (
    <VisitorContext.Provider value={{
      isVisitor,
      setVisitorMode,
      clearVisitorMode,
    }}>
      {children}
    </VisitorContext.Provider>
  );
};