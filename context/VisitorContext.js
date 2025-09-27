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
    // Initialize global listeners array
    if (typeof global !== 'undefined' && !global.visitorStateChangeListeners) {
      global.visitorStateChangeListeners = [];
    }

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
      console.log('Setting visitor mode to:', visitorStatus);
      setIsVisitor(visitorStatus);
      await AsyncStorage.setItem('isVisitor', JSON.stringify(visitorStatus));
      
      // Emit event for screens to listen to
      if (typeof global !== 'undefined' && global.visitorStateChangeListeners) {
        console.log('Emitting visitor state change event to', global.visitorStateChangeListeners.length, 'listeners');
        global.visitorStateChangeListeners.forEach(listener => {
          try {
            listener(visitorStatus);
          } catch (error) {
            console.error('Error calling visitor state change listener:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error saving visitor state:', error);
    }
  };

  const clearVisitorMode = async () => {
    try {
      console.log('Clearing visitor mode...');
      setIsVisitor(false);
      await AsyncStorage.removeItem('isVisitor');
      
      // Emit event for screens to listen to
      if (typeof global !== 'undefined' && global.visitorStateChangeListeners) {
        console.log('Emitting visitor state change event to', global.visitorStateChangeListeners.length, 'listeners');
        global.visitorStateChangeListeners.forEach(listener => {
          try {
            listener(false);
          } catch (error) {
            console.error('Error calling visitor state change listener:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error clearing visitor state:', error);
    }
  };

  // Function to register visitor state change listeners
  const addVisitorStateChangeListener = (listener) => {
    if (typeof global !== 'undefined') {
      if (!global.visitorStateChangeListeners) {
        global.visitorStateChangeListeners = [];
      }
      global.visitorStateChangeListeners.push(listener);
      
      // Return cleanup function
      return () => {
        if (global.visitorStateChangeListeners) {
          const index = global.visitorStateChangeListeners.indexOf(listener);
          if (index > -1) {
            global.visitorStateChangeListeners.splice(index, 1);
          }
        }
      };
    }
    return () => {};
  };

  return (
    <VisitorContext.Provider value={{
      isVisitor,
      setVisitorMode,
      clearVisitorMode,
      addVisitorStateChangeListener,
    }}>
      {children}
    </VisitorContext.Provider>
  );
};