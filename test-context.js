// Test file to check if VisitorContext exports are working
import { useVisitor, VisitorProvider } from './context/VisitorContext';

console.log('useVisitor export:', typeof useVisitor);
console.log('VisitorProvider export:', typeof VisitorProvider);

// Test if we can create a simple context consumer
const TestComponent = () => {
  try {
    const context = useVisitor();
    console.log('Context loaded successfully:', context);
    return null;
  } catch (error) {
    console.log('Context error:', error.message);
    return null;
  }
};

export { TestComponent };