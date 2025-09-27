import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
  SectionList,
  Animated,
  SafeAreaView,
  PanResponder,
  Linking, Alert, InteractionManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetch } from 'expo/fetch';
import { useTheme } from '../context/ThemeContext';
import { useVisitor } from '../context/VisitorContext';
import { mockCirculars } from '../data/mockData';

// Persistent storage (outside component) - Data persists between remounts
let globalCircularsData = [];
let hasLoadedData = false;
let isLoadingInBackground = false;
let lastLoadingProgress = 0;
let shouldShowLoadingIndicator = false;
let initialLoadStarted = false;
let loadingUpdateInterval = null;
let backgroundLoadingController = null;
let receivedCount = 0;
let dataByGroup = {};

// Click queue for guaranteed tap handling
const clickQueue = [];
let isProcessingClick = false;
const processClickQueue = () => {
  if (isProcessingClick || clickQueue.length === 0) return;
  isProcessingClick = true;
  const { item, itemId, callback } = clickQueue.shift();
  InteractionManager.runAfterInteractions(async () => {
    await callback(item, itemId);
    isProcessingClick = false;
    processClickQueue();
  });
};

// Indexed ScrollBar Component
const IndexedScrollBar = ({ sections, onIndexPress, sortType, isDarkMode, sectionListRef, disabled }) => {
  // OPTIMIZED: Memoize indices calculation
  const indices = useMemo(() => {
    if (sortType === 'date') {
      return sections.map(section => {
        const [month, year] = section.title.split(' ');
        const shortYear = year ? year.slice(-2) : '';
        return {
          label: `${month ? month.substring(0, 3).toUpperCase() : ''}\n'${shortYear}`,
          value: section.title
        };
      });
    } else {
      return sections.map(section => ({
        label: section.title ? section.title[0].toUpperCase() : '',
        value: section.title
      }));
    }
  }, [sections, sortType]);

  const [activeIndex, setActiveIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const itemHeight = sortType === 'date' ? 32 : 20;
  const POP_DISTANCE = -35;

  // Use individual animation refs for better tracking
  const scaleAnims = useRef(indices.map(() => new Animated.Value(1))).current;
  const translateXAnims = useRef(indices.map(() => new Animated.Value(0))).current;

  const containerRef = useRef(null);
  const scrollbarMeasurements = useRef({
    y: 0,
    height: 0,
    measured: false
  });

  // Track if component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Reset animations when sections change
  useEffect(() => {
    // Create new animation values if length changed
    if (scaleAnims.length !== indices.length) {
      scaleAnims.length = 0;
      translateXAnims.length = 0;

      indices.forEach((_, i) => {
        scaleAnims[i] = new Animated.Value(1);
        translateXAnims[i] = new Animated.Value(0);
      });
    }

    resetAllAnimations();

    // Force measure on next render
    if (containerRef.current) {
      setTimeout(() => {
        if (isMounted.current && containerRef.current) {
          measureScrollbar();
        }
      }, 300);
    }
  }, [sections, sortType, indices.length]);

  // Measure scrollbar whenever it's layout changes
  const measureScrollbar = () => {
    if (containerRef.current) {
      try {
        containerRef.current.measure((_, __, ___, height, ____, pageY) => {
          if (isMounted.current) {
            scrollbarMeasurements.current = {
              y: pageY,
              height: height,
              measured: true
            };
          }
        });
      } catch (error) {
        console.warn('Error measuring scrollbar:', error);
      }
    }
  };

  // OPTIMIZED: Simplified animations for better performance
  const animateIndex = useCallback((index, isActive, isDraggingNow = false) => {
    if (index < 0 || index >= indices.length || !isMounted.current) return;

    const scale = isActive ? (isDraggingNow ? 1.3 : 1.2) : 1;
    const translateX = isActive ? (isDraggingNow ? POP_DISTANCE : POP_DISTANCE / 2) : 0;

    Animated.parallel([
      Animated.spring(scaleAnims[index], {
        toValue: scale,
        friction: 8,
        tension: 100,
        useNativeDriver: true
      }),
      Animated.spring(translateXAnims[index], {
        toValue: translateX,
        friction: 8,
        tension: 100,
        useNativeDriver: true
      })
    ]).start();
  }, [indices.length, scaleAnims, translateXAnims]);

  // Reset all animations to default state
  const resetAllAnimations = useCallback(() => {
    if (!isMounted.current) return;

    indices.forEach((_, i) => {
      animateIndex(i, false);
    });
    setActiveIndex(null);
    setIsDragging(false);
  }, [indices, animateIndex]);

  // Handle index activation
  const activateIndex = useCallback((index, i, isDraggingNow = false) => {
    if (!index || !index.value || !isMounted.current) return;

    // Reset previous active index if different
    if (activeIndex !== null && activeIndex !== i) {
      animateIndex(activeIndex, false);
    }

    setActiveIndex(i);

    // Add a small delay before triggering the scroll to ensure animations are processed first
    setTimeout(() => {
      if (isMounted.current) {
        console.log(`Activating index ${i} with value ${index.value}`);
        onIndexPress(index.value);
      }
    }, 10);

    animateIndex(i, true, isDraggingNow);
  }, [onIndexPress, animateIndex, activeIndex]);

  // Handle press on an index
  const handleIndexPress = useCallback((index, i) => {
    console.log(`Index pressed: ${i}, value: ${index.value}`);

    // Ensure the index is valid
    if (!index || !index.value) {
      console.warn('Invalid index pressed');
      return;
    }

    // Activate the index with a visual indication
    activateIndex(index, i, true);

    // Auto-reset animation after a delay
    setTimeout(() => {
      if (isMounted.current && i === activeIndex) {
        animateIndex(i, true, false);
      }
    }, 500);

    // Reset all animations after longer delay
    setTimeout(() => {
      if (isMounted.current) {
        resetAllAnimations();
      }
    }, 2000);
  }, [activateIndex, activeIndex, animateIndex, resetAllAnimations]);

  // Measure container position and size
  const handleLayout = useCallback(() => {
    // Use setTimeout to ensure the component is fully rendered
    setTimeout(measureScrollbar, 100);
  }, []);

  // Calculate index from Y position
  const getIndexFromY = useCallback((y) => {
    const { y: scrollbarY, height: scrollbarHeight, measured } = scrollbarMeasurements.current;

    if (!measured) return 0;

    const relativeY = y - scrollbarY;
    const totalHeight = indices.length * itemHeight;
    const normalizedY = (relativeY / scrollbarHeight) * totalHeight;
    return Math.max(0, Math.min(indices.length - 1, Math.floor(normalizedY / itemHeight)));
  }, [indices.length, itemHeight]);

  // Create pan responder for dragging interaction
  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (_, gestureState) => {
      setIsDragging(true);
      // Measure again to ensure accurate positioning
      measureScrollbar();

      // Small delay to ensure measurement is complete
      setTimeout(() => {
        if (isMounted.current) {
          const idx = getIndexFromY(gestureState.y0);
          if (indices[idx] && indices[idx].value) {
            activateIndex(indices[idx], idx, true);
          }
        }
      }, 10);
    },

    onPanResponderMove: (_, gestureState) => {
      const currentIdx = getIndexFromY(gestureState.moveY);
      if (currentIdx !== activeIndex && indices[currentIdx] && indices[currentIdx].value) {
        activateIndex(indices[currentIdx], currentIdx, true);
      }
    },

    onPanResponderRelease: () => {
      setIsDragging(false);
      if (activeIndex !== null) {
        animateIndex(activeIndex, true, false);
        setTimeout(() => {
          if (isMounted.current) {
            resetAllAnimations();
          }
        }, 2000);
      }
    },

    onPanResponderTerminate: () => {
      setIsDragging(false);
      resetAllAnimations();
    }
  }), [indices, activeIndex, getIndexFromY, activateIndex, animateIndex, resetAllAnimations]);

  // Calculate dynamic top offset for centering
  const totalHeight = indices.length * itemHeight;
  const translateY = -(totalHeight / 2);

  return (
    <Animated.View
      ref={containerRef}
      style={[
        styles.indexedScrollBar,
        isDarkMode && styles.indexedScrollBarDark,
        {
          position: 'absolute',
          right: 8,
          top: sortType === 'date' ? '35%' : '45%',
          transform: [{ translateY }],
          opacity: 0.9,
          zIndex: 20,
        }
      ]}
      onLayout={handleLayout}
      pointerEvents={disabled ? 'none' : 'auto'}
      {...panResponder.panHandlers}
    >
      <View style={styles.indexList}>
        {indices.map((index, i) => (
          <Animated.View
            key={i}
            style={{
              transform: [
                { scale: scaleAnims[i] || new Animated.Value(1) },
                { translateX: translateXAnims[i] || new Animated.Value(0) }
              ],
              marginVertical: sortType === 'date' ? 1 : 0,
              borderRadius: 10,
              backgroundColor: 'transparent',
              shadowColor: activeIndex === i ? '#000' : 'transparent',
              shadowOpacity: activeIndex === i ? 0.2 : 0,
              shadowRadius: activeIndex === i ? 4 : 0,
              elevation: activeIndex === i ? 4 : 0,
              minWidth: sortType === 'date' ? 32 : 24,
              minHeight: itemHeight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TouchableOpacity
              style={[
                styles.indexItem,
                isDarkMode && styles.indexItemDark,
                activeIndex === i && styles.indexItemActive,
                {
                  minWidth: sortType === 'date' ? 32 : 24,
                  minHeight: itemHeight,
                  backgroundColor: activeIndex === i ? (isDarkMode ? '#19C6C1' : '#0F172A') : 'transparent',
                },
              ]}
              onPress={() => handleIndexPress(index, i)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.indexText,
                isDarkMode && styles.indexTextDark,
                {
                  fontSize: 9,
                  fontWeight: 'bold',
                  letterSpacing: 2,
                  textAlign: 'center',
                  lineHeight: sortType === 'date' ? 14 : 11
                },
                activeIndex === i && { color: isDarkMode ? '#fff' : '#fff' }
              ]}>
                {index.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const CircularsScreen = ({ navigation }) => {
  // FIXED: Initialize state from persistent storage instead of refs
  const [originalData, setOriginalData] = useState(globalCircularsData);
  const [loading, setLoading] = useState(!hasLoadedData);
  const [initialLoading, setInitialLoading] = useState(!hasLoadedData);
  const [loadingProgress, setLoadingProgress] = useState(lastLoadingProgress);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortType, setSortType] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFullScreenLoading, setShowFullScreenLoading] = useState(!hasLoadedData);
  const [loadingItems, setLoadingItems] = useState(new Map());
  const [showSideLoading, setShowSideLoading] = useState(shouldShowLoadingIndicator);
  
  // FIXED: Persist hasLoadedData in component state
  const [hasDataLoaded, setHasDataLoaded] = useState(hasLoadedData);
  
  // NEW: Connecting overlay state for initial fetch - show when no cached data
  const [showConnectingOverlay, setShowConnectingOverlay] = useState(!hasLoadedData);

  // Animation value for loading indicator
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  // FIXED: Use refs for component-specific state that doesn't need to persist
  const isProcessingRef = useRef(false);
  const isMounted = useRef(true);
  const fetchControllerRef = useRef(null);

  const { isDarkMode, theme } = useTheme();
  const { isVisitor, addVisitorStateChangeListener } = useVisitor();

  // FIXED: Use refs for component-specific state
  const loadingItemsRef = useRef(new Map());
  const sectionListRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Add effect to handle component lifecycle
  useEffect(() => {
    if (!hasLoadedData && !isLoadingInBackground) {
      setShowConnectingOverlay(true); // Show immediately
      loadingOpacity.setValue(1);
      setTimeout(() => {
        startBackgroundLoading();
      }, 0);
    }
  }, [isVisitor]); // Add isVisitor dependency

  // Initialize component state from global variables
  useEffect(() => {
    // Restore data from global variables if available
    if (hasLoadedData && globalCircularsData.length > 0) {
      setOriginalData([...globalCircularsData]);
      setLoading(false);
      setShowFullScreenLoading(false);
      setShowSideLoading(false);
      setShowConnectingOverlay(false);
      setLoadingProgress(globalCircularsData.length);
      setHasDataLoaded(true);
      setInitialLoading(false);
    } else if (isLoadingInBackground) {
      setLoading(true);
      setShowFullScreenLoading(false);
      setShowSideLoading(true);
      setShowConnectingOverlay(false);
      setInitialLoading(false);
      setLoadingProgress(lastLoadingProgress);
    } else {
      // Start fresh loading if no data available
      setLoading(true);
      setShowFullScreenLoading(false);
      setShowSideLoading(false);
      setShowConnectingOverlay(true); // Show connecting overlay immediately
      setInitialLoading(true);
      setLoadingProgress(0);
      loadingOpacity.setValue(1); // Ensure connecting overlay is visible
      // Start the background loading
      // (Do not call startBackgroundLoading here, only in the first effect above)
    }
  }, []);

  // Add effect to handle navigation focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMounted.current) {
        // Always restore from global storage
        setOriginalData([...globalCircularsData]);
        setLoadingProgress(lastLoadingProgress);
        
        // Handle completed state
        if (hasLoadedData) {
          setLoading(false);
          setShowFullScreenLoading(false);
          setShowSideLoading(false);
          setShowConnectingOverlay(false);
          setLoadingProgress(globalCircularsData.length);
          setHasDataLoaded(true);
          setInitialLoading(false);
        }
        // Handle loading state
        else if (isLoadingInBackground) {
          setLoading(true);
          setShowFullScreenLoading(false);
          setShowSideLoading(true);
          setShowConnectingOverlay(false);
          setInitialLoading(false);
          loadingOpacity.setValue(1); // Ensure connecting overlay is visible
        }
        // Handle not started state
        else {
          setLoading(true);
          setShowFullScreenLoading(false);
          setShowSideLoading(false);
          setShowConnectingOverlay(true);
          setInitialLoading(true);
          loadingOpacity.setValue(1); // Ensure connecting overlay is visible
        }
        
        // Always reset loading items when returning to screen
        loadingItemsRef.current = new Map();
        setLoadingItems(new Map());
      }
    });

    return () => {
      unsubscribe();
      // Clear loading interval on unmount
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }
      
      // REMOVED: Abort any ongoing fetch - Allow uninterrupted background loading
      // if (backgroundLoadingController) {
      //   backgroundLoadingController.abort();
      // }
    };
  }, [navigation]);

  // FIXED: Add continuous data sync effect to ensure UI updates regardless of navigation
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isMounted.current && isLoadingInBackground) {
        // Continuously sync data and loading state
        if (globalCircularsData.length !== originalData.length) {
          setOriginalData([...globalCircularsData]); // Force update with new array
        }
        setLoadingProgress(lastLoadingProgress);
        setShowSideLoading(shouldShowLoadingIndicator);
        
        // Update loading indicator visibility
        if (lastLoadingProgress >= 5) {
          setShowFullScreenLoading(false);
          setShowConnectingOverlay(false);
          setInitialLoading(false);
        } else if (lastLoadingProgress >= 1) {
          setShowConnectingOverlay(false);
          setShowFullScreenLoading(true);
        }
      }
    }, 300); // Faster sync

    return () => {
      clearInterval(syncInterval);
    };
  }, [isLoadingInBackground, originalData.length, lastLoadingProgress]);

  // FIXED: Add UI sync effect to continuously sync with persistent storage
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current && isLoadingInBackground) {
        setOriginalData([...globalCircularsData]); // Force update with new array
        setLoadingProgress(lastLoadingProgress);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isLoadingInBackground]);

  // FIXED: Add dedicated UI update effect to force re-renders
  useEffect(() => {
    const uiUpdateInterval = setInterval(() => {
      if (isMounted.current && isLoadingInBackground) {
        // Force update with new array reference
        setOriginalData([...globalCircularsData]);
        setLoadingProgress(lastLoadingProgress);
      }
    }, 500);

    return () => clearInterval(uiUpdateInterval);
  }, []);

  // FIXED: Update hasDataLoaded when hasLoadedData changes
  useEffect(() => {
    if (hasLoadedData) {
      setHasDataLoaded(true);
    }
  }, [hasLoadedData]);

  // DEBUG: Track connecting overlay state changes
  useEffect(() => {
    console.log('showConnectingOverlay changed to:', showConnectingOverlay);
  }, [showConnectingOverlay]);

  // Helper function to parse date string in "month_name-year-day" format
  const parseDateString = (dateString) => {
    if (!dateString) return null;

    const parts = dateString.split('-');
    if (parts.length !== 3) return null;

    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3,
      'May': 4, 'June': 5, 'July': 6, 'August': 7,
      'September': 8, 'October': 9, 'November': 10, 'December': 11
    };

    if (isNaN(year) || isNaN(day) || monthMap[monthName] === undefined) {
      return null;
    }

    return new Date(year, monthMap[monthName], day);
  };

  // Helper to extract month from date string
  const getMonthFromDateString = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    return parts.length >= 1 ? parts[0] : null;
  };

  // Helper to extract year from date string
  const getYearFromDateString = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    return parts.length >= 2 ? parseInt(parts[1]) : null;
  };

  // OPTIMIZED: Precompute searchable fields when data is received
  const processedData = useMemo(() => {
    if (!originalData || !Array.isArray(originalData) || originalData.length === 0) return [];
    
    const start = Date.now();
    const result = originalData.map(item => ({
      ...item,
      id: item.id || `circular-${item.filename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      displayName: item.filename ? item.filename.split(':::')[1] || item.filename : 'Unnamed Document',
      originalFilename: item.filename,
      // Precompute searchable fields for better performance
      searchableName: (item.filename ? item.filename.split(':::')[1] || item.filename : 'Unnamed Document').toLowerCase().replace(/[^a-z0-9]/gi, ''),
      searchableDate: (item.date || '').toLowerCase().replace(/[^a-z0-9]/gi, ''),
      searchableFilename: (item.filename || '').toLowerCase().replace(/[^a-z0-9]/gi, ''),
      // Precompute parsed date for sorting
      parsedDate: parseDateString(item.date)
    }));
    
    if (originalData.length > 100) {
      console.log(`Processed ${originalData.length} items in ${Date.now() - start}ms`);
    }
    
    return result;
  }, [originalData]);

  // OPTIMIZED: Memoize filtered data with improved search performance
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return processedData;
    
    const start = Date.now();
    const searchTerms = debouncedSearchQuery.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
    
    const result = processedData.filter(item => 
      searchTerms.every(term => 
        item.searchableName.includes(term) || 
        item.searchableDate.includes(term) ||
        item.searchableFilename.includes(term)
      )
    );
    
    if (processedData.length > 50) {
      console.log(`Filtered ${processedData.length} items to ${result.length} in ${Date.now() - start}ms`);
    }
    
    return result;
  }, [processedData, debouncedSearchQuery]);

  // OPTIMIZED: Memoize grouped and sorted data
  const circulars = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    const start = Date.now();
    
    // Define month order for proper sorting
    const monthOrder = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };

    let result;
    
    if (sortType === 'date') {
      let groupedData = {};

      // Process each item and add to appropriate group
      filteredData.forEach((item) => {
        if (!item.date) return;

        const month = getMonthFromDateString(item.date);
        const year = getYearFromDateString(item.date);

        if (!month || !year) return;

        const key = `${year} ${month}`;

        if (!groupedData[key]) {
          groupedData[key] = {
            title: `${month} ${year}`,
            month: month,
            year: year,
            data: []
          };
        }

        groupedData[key].data.push(item);
      });

      // Sort items within each month group
      Object.values(groupedData).forEach(group => {
        group.data.sort((a, b) => {
          const dateA = a.parsedDate;
          const dateB = b.parsedDate;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      });

      // Convert to array and sort by year first, then by month
      result = Object.values(groupedData);
      result.sort((a, b) => {
        if (a.year !== b.year) {
          return sortOrder === 'desc' ? b.year - a.year : a.year - b.year;
        }
        return sortOrder === 'desc'
          ? monthOrder[b.month] - monthOrder[a.month]
          : monthOrder[a.month] - monthOrder[b.month];
      });
    } else {
      // Sort and group by name with improved performance
      const sortedData = [...filteredData].sort((a, b) => {
        const nameA = (a.displayName || '').toLowerCase();
        const nameB = (b.displayName || '').toLowerCase();
        
        if (nameA === nameB) return 0;
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });

      // Group by first letter with better handling of special characters
      const grouped = {};
      sortedData.forEach((item) => {
        if (!item.displayName) return;

        const firstChar = item.displayName.charAt(0).toUpperCase();
        const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

        if (!grouped[letter]) {
          grouped[letter] = {
            title: letter,
            data: []
          };
        }

        grouped[letter].data.push(item);
      });

      // Convert to array and sort alphabetically
      result = Object.values(grouped);
      result.sort((a, b) => {
        // Handle special case for '#' group
        if (a.title === '#') return 1;
        if (b.title === '#') return -1;
        
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      });
    }
    
    if (filteredData.length > 50) {
      console.log(`Grouped and sorted ${filteredData.length} items into ${result.length} sections in ${Date.now() - start}ms`);
    }
    
    return result;
  }, [filteredData, sortType, sortOrder]);

  // Handle data updates
  const updateData = useCallback((newData) => {
    setOriginalData(newData);
  }, []);
  // Add effect to handle loading updates
  useEffect(() => {
    // Start interval for loading updates when component mounts
    if (isLoadingInBackground) {
      loadingUpdateInterval = setInterval(() => {
        if (isLoadingInBackground) {
          setLoadingProgress(lastLoadingProgress);
          setShowSideLoading(shouldShowLoadingIndicator);
        }
      }, 100); // Update every 100ms
    }

    return () => {
      // Clear interval when component unmounts
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }
    };
  }, []);

  // Add effect to handle initial loading
  useEffect(() => {
    if (!initialLoadStarted && !hasLoadedData) {
      initialLoadStarted = true;
      
      // FIXED: Force show loading overlay immediately
      setShowFullScreenLoading(true);
      loadingOpacity.setValue(1);
      
      startBackgroundLoading();
    }
  }, []);

  // OPTIMIZED: Improved search handling with better responsiveness
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 100); // Reduced from 150ms to 100ms for faster response

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Add search status tracking
  const [isSearching, setIsSearching] = useState(false);
  const [filteredResultsCount, setFilteredResultsCount] = useState(0);

  // OPTIMIZED: Improved search handler with visual feedback
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    setIsSearching(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set searching to false after a short delay
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 150);
  }, []);

  // Clear search with immediate feedback
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setIsSearching(false);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Listen for visitor state changes and reset circulars
  useEffect(() => {
    const unsubscribe = addVisitorStateChangeListener((newVisitorState) => {
      console.log('Visitor state changed to:', newVisitorState, 'resetting circulars...');
      
      // Force immediate state reset
      setOriginalData([]);
      setSearchQuery('');
      setDebouncedSearchQuery('');
      setLoadingItems(new Map());
      setHasDataLoaded(false);
      
      // Reset global variables immediately
      globalCircularsData = [];
      hasLoadedData = false;
      isLoadingInBackground = false;
      lastLoadingProgress = 0;
      shouldShowLoadingIndicator = false;
      initialLoadStarted = false;
      receivedCount = 0;
      
      // Clear intervals and controllers
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }
      if (backgroundLoadingController) {
        backgroundLoadingController.abort();
        backgroundLoadingController = null;
      }
      
      // Reset loading states
      setLoading(true);
      setInitialLoading(true);
      setLoadingProgress(0);
      setShowFullScreenLoading(true);
      setShowConnectingOverlay(true);
      setShowSideLoading(false);
      loadingOpacity.setValue(1);
      
      // Force a re-render by updating state
      setTimeout(() => {
        console.log('Starting fresh loading for visitor state:', newVisitorState);
        startBackgroundLoading({ forceRefresh: true });
      }, 50);
    });

    return unsubscribe;
  }, [addVisitorStateChangeListener]);

  // Add this new function to handle manual refresh
  const handleManualRefresh = useCallback(() => {
    setOriginalData([]);
    globalCircularsData = [];
    hasLoadedData = false;
    isLoadingInBackground = false;
    lastLoadingProgress = 0;
    shouldShowLoadingIndicator = false;
    initialLoadStarted = false;
    receivedCount = 0;
    setHasDataLoaded(false);
    setLoading(true);
    setInitialLoading(true);
    setLoadingProgress(0);
    setShowFullScreenLoading(true);
    setShowConnectingOverlay(false);
    setShowSideLoading(false);
    loadingOpacity.setValue(1);
    if (loadingUpdateInterval) {
      clearInterval(loadingUpdateInterval);
      loadingUpdateInterval = null;
    }
    if (backgroundLoadingController) {
      backgroundLoadingController.abort();
      backgroundLoadingController = null;
    }
    startBackgroundLoading({ forceRefresh: true });
  }, []);

  // Update filtered results count when filtered data changes
  useEffect(() => {
    setFilteredResultsCount(filteredData.length);
  }, [filteredData]);

  // Modify startBackgroundLoading to handle initial loading better
  const startBackgroundLoading = async (options = {}) => {
    // Handle visitor mode - use mock data directly
    if (isVisitor) {
      setShowConnectingOverlay(true);
      globalCircularsData = [...mockCirculars]; // Use mock data
      setOriginalData([...mockCirculars]);
      setLoadingProgress(mockCirculars.length);
      setLoading(false);
      setShowFullScreenLoading(false);
      setShowSideLoading(false);
      setShowConnectingOverlay(false);
      setInitialLoading(false);
      setHasDataLoaded(true);
      hasLoadedData = true;
      isLoadingInBackground = false;
      lastLoadingProgress = mockCirculars.length;
      shouldShowLoadingIndicator = false;
      receivedCount = mockCirculars.length;
      return;
    }

    setShowConnectingOverlay(true); // Always show connecting overlay at the start
    globalCircularsData = [];
    setOriginalData([]);
    if (!hasLoadedData || options.forceRefresh) {
      setLoadingProgress(0);
      setShowFullScreenLoading(false); // Do not show full screen loading for initial fetch
      setShowSideLoading(false);
      loadingOpacity.setValue(1);
      setInitialLoading(true);
    }
    if (hasLoadedData && globalCircularsData.length > 0 && !options.forceRefresh) {
      setLoading(false);
      setShowFullScreenLoading(false);
      setShowSideLoading(false);
      setShowConnectingOverlay(false);
      setInitialLoading(false);
      setLoadingProgress(globalCircularsData.length);
      setHasDataLoaded(true);
      setOriginalData([...globalCircularsData]);
      return;
    }
    if (isLoadingInBackground && !options.forceRefresh) {
      if (lastLoadingProgress === 0) setShowConnectingOverlay(true);
      else if (lastLoadingProgress > 0 && lastLoadingProgress < 5) setShowFullScreenLoading(true);
      else setShowSideLoading(true);
      return;
    }
    isLoadingInBackground = true;
    hasLoadedData = false;
    setLoading(true);
    lastLoadingProgress = 0;
    shouldShowLoadingIndicator = false;
    receivedCount = 0;
    setHasDataLoaded(false);

    // Force an immediate progress update
    setLoadingProgress(0);

    if (backgroundLoadingController) {
      backgroundLoadingController.abort();
    }

    const controller = new AbortController();
    backgroundLoadingController = controller;

    // Batching variables for optimized updates
    let batch = [];
    const BATCH_SIZE = 10;
    const BATCH_INTERVAL = 200; // ms
    let lastBatchTime = Date.now();

    // Throttle UI updates
    let lastUIUpdateTime = 0;
    function throttledSetOriginalData() {
      const now = Date.now();
      if (now - lastUIUpdateTime > 300) {
        setOriginalData([...globalCircularsData]);
        lastUIUpdateTime = now;
      }
    }

    // Throttle progress updates
    let lastUpdateTime = 0;
    loadingUpdateInterval = setInterval(() => {
      if (Date.now() - lastUpdateTime < 300) return; // Throttle to 300ms
      lastUpdateTime = Date.now();
      setLoadingProgress(receivedCount);
      setShowSideLoading(shouldShowLoadingIndicator);
    }, 100);

    const apiUrl = `https://faculty-availability-api.onrender.com/stream-circulars?t=${Date.now()}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let allData = [];

      let firstItemReceived = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining batch
          if (batch.length > 0) {
            globalCircularsData = [...globalCircularsData, ...batch];
            throttledSetOriginalData();
            batch = [];
          }

          // Clear loading interval
          if (loadingUpdateInterval) {
            clearInterval(loadingUpdateInterval);
            loadingUpdateInterval = null;
          }

          // Update persistent storage with loaded data
          hasLoadedData = true;
          isLoadingInBackground = false;
          lastLoadingProgress = receivedCount;
          shouldShowLoadingIndicator = false;
          setLoading(false);
          setInitialLoading(false);
          setShowFullScreenLoading(false);
          setShowSideLoading(false);
          setShowConnectingOverlay(false); // Hide connecting overlay after success
          setLoadingProgress(receivedCount);  // Show final count
          setHasDataLoaded(true);
          setOriginalData([...globalCircularsData]);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim();
              const json = JSON.parse(jsonStr);
              batch.push(json);
              receivedCount += 1;
              const currentProgress = receivedCount;
              lastLoadingProgress = currentProgress;

              // Hide connecting overlay after first item is received
              if (!firstItemReceived && receivedCount >= 1) {
                setShowConnectingOverlay(false);
                setShowFullScreenLoading(true); // Now show loading progress if needed
                setInitialLoading(false);
                firstItemReceived = true;
              }

              // Process batch when size threshold or time interval is reached
              if (batch.length >= BATCH_SIZE || Date.now() - lastBatchTime > BATCH_INTERVAL) {
                globalCircularsData = [...globalCircularsData, ...batch];
                throttledSetOriginalData();
                batch = [];
                lastBatchTime = Date.now();
              }

              if (currentProgress >= 5) {
                shouldShowLoadingIndicator = true;
                setShowFullScreenLoading(false);
                setShowSideLoading(true);
                setInitialLoading(false);
              }
            } catch (err) {
              console.warn('Error parsing line:', line);
            }
          }
        }

        buffer = lines[lines.length - 1];
        // Also throttle UI update after each chunk
        throttledSetOriginalData();
      }
    } catch (err) {
      // Clear loading interval on error
      if (loadingUpdateInterval) {
        clearInterval(loadingUpdateInterval);
        loadingUpdateInterval = null;
      }

      if (!controller.signal.aborted) {
        console.error('Fetch error:', err.message);
        isLoadingInBackground = false;
        lastLoadingProgress = receivedCount;
        shouldShowLoadingIndicator = receivedCount >= 5;
        
        setLoading(false);
        setShowFullScreenLoading(false);
        setShowSideLoading(shouldShowLoadingIndicator);
        setShowConnectingOverlay(false); // Hide connecting overlay on error
        
        if (receivedCount === 0) {
          Alert.alert('Fetch Failed', `${err.message}`, [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Retry', 
              onPress: () => {
                initialLoadStarted = false; // Reset initial load flag
                startBackgroundLoading();
              }
            }
          ]);
        }
      }
    }
  };

  const handleNewItem = (data) => {
    try {
      receivedCount += 1;

      const processedData = {
        filename: data.filename || 'Unnamed Document',
        url: data.url || '',
        date: data.date || 'Unknown Date',
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        ...data
      };

      setOriginalData(prev => {
        const newData = [...prev, processedData];
        return newData;
      });

      setLoadingProgress(prev => prev + 1);

      // After receiving first data, remove initial loading overlay
      if (initialLoading && receivedCount >= 1) {
        setInitialLoading(false);
      }

      // After receiving 5 items, transition from full-screen loading to side indicator
      if (showFullScreenLoading && receivedCount >= 5) {
        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }).start(() => {
          if (isMounted.current) {
            setShowFullScreenLoading(false);
            setLoading(true); // Set loading to true to show side indicator
          }
        });
      }
    } catch (error) {
      console.error('Error handling new item:', error);
    }
  }
  const renderSectionHeader = ({ section }) => (
    <Text
      style={[
        styles.monthHeader,
        isDarkMode && styles.monthHeaderDark
      ]}
    >
      {section.title}
    </Text>
  );

  // Restore handleItemPress function
  const handleItemPress = useCallback(async (item, itemId) => {
    if (loadingItemsRef.current.get(itemId)) return;
    if (!isMounted.current) return;
    console.log('Circular press handler called for:', item.displayName, 'with ID:', itemId);
    
    // Handle visitor mode - redirect to mock URL
    if (isVisitor) {
      if (item.downloadUrl) {
        try {
          const canOpen = await Linking.canOpenURL(item.downloadUrl);
          if (canOpen) {
            await Linking.openURL(item.downloadUrl);
          } else {
            Alert.alert('Error', 'Cannot open this URL on your device.');
          }
        } catch (error) {
          console.error('Error opening URL:', error);
          Alert.alert('Error', 'Failed to open the URL.');
        }
      } else {
        Alert.alert('Visitor Mode', 'Demo circular - no URL available');
      }
      return;
    }
    
    // Set loading state immediately for this specific item only
    const newLoadingItems = new Map(loadingItemsRef.current);
    newLoadingItems.set(itemId, true);
    loadingItemsRef.current = newLoadingItems;
    setLoadingItems(newLoadingItems);
    try {
      // Validate item data
      if (!item || !item.filename) {
        console.warn('Invalid item data:', item);
        Alert.alert(
          'Error',
          'This document is not available.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Construct URL
      const url = `https://faculty-availability-api.onrender.com/get-item/?object_key=Circulars/${encodeURIComponent(item.filename)}`;
      console.log('Fetching from URL:', url);

      // Make the request with shorter timeout for better responsiveness
      const timeoutId = setTimeout(() => {
        console.log('Request timeout for item:', itemId);
      }, 5000); // 5 second timeout

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          console.error('API response not ok:', response.status, response.statusText);
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response data:', data);

        if (!isMounted.current) return;

        if (!data || !data.presigned_url) {
          console.error('No presigned_url in API response:', data);
          throw new Error('Invalid response: No presigned URL');
        }

        console.log('presigned_url:', data.presigned_url);
        const canOpen = await Linking.canOpenURL(data.presigned_url);
        console.log('canOpenURL result:', canOpen);

        if (!isMounted.current) return;

        if (!canOpen) {
          throw new Error('Cannot open this type of document');
        }

        // Open the URL with shorter timeout
        const openTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout opening URL')), 3000)
        );
        const openPromise = Linking.openURL(data.presigned_url);
        await Promise.race([openPromise, openTimeout]);
        if (!isMounted.current) return;
        console.log('Successfully opened document');
      } catch (error) {
        console.error('Error in handleItemPress:', error);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (!isMounted.current) return;
      let errorMessage = 'Failed to open document. Please try again later.';
      if (error.message.includes('Server error: 404')) {
        errorMessage = 'This document is no longer available.';
      } else if (error.message.includes('Server error: 500')) {
        errorMessage = 'Server is temporarily unavailable. Please try again later.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Please check your internet connection and try again.';
      } else if (error.message.includes('Cannot open this type of document')) {
        errorMessage = 'This document format is not supported on your device.';
      } else if (error.message.includes('Invalid response')) {
        errorMessage = 'Unable to get document URL. Please try again.';
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      if (!isMounted.current) return;
      // Clear loading state for this specific item only
      const newLoadingItems = new Map(loadingItemsRef.current);
      newLoadingItems.delete(itemId);
      loadingItemsRef.current = newLoadingItems;
      setLoadingItems(newLoadingItems);
    }
  }, []);

  // Highly optimized CircularItem component to reduce touch delay
  const CircularItem = React.memo(({ item, itemId, isDarkMode, onPress, loadingItems }) => {
    // Use useMemo for all computed values to prevent recalculation
    const itemData = React.useMemo(() => ({
      displayName: item.displayName || 'Unnamed Document',
      date: item.date || 'Unknown Date'
    }), [item.displayName, item.date]);

    // Memoize all styles to prevent recreation
    const baseContainerStyle = React.useMemo(() => [
      styles.circularItem,
      isDarkMode && styles.circularItemDark,
      styles.circularItemOptimized
    ], [isDarkMode]);

    const titleStyle = React.useMemo(() => [
      styles.circularTitle,
      isDarkMode && styles.circularTitleDark,
    ], [isDarkMode]);

    const dateStyle = React.useMemo(() => [
      styles.circularDate,
      isDarkMode && styles.circularDateDark,
    ], [isDarkMode]);

    const iconColor = React.useMemo(() => 
      isDarkMode ? '#4A4A4A' : '#DEDEDE', 
      [isDarkMode]
    );

    // Use useCallback for press handler
    const handlePress = useCallback(() => {
      // Queue the click for guaranteed handling
      clickQueue.push({ item, itemId, callback: onPress });
      processClickQueue();
    }, [item, itemId, onPress]);

    // Use Pressable's style function to set opacity on press
    return (
      <Pressable
        style={({ pressed }) => [
          ...baseContainerStyle,
          pressed && { opacity: 0.5 },
          loadingItems.get(itemId) && styles.circularItemOptimizedLoading,
        ]}
        onPress={handlePress}
        android_ripple={{ color: '#19C6C1', borderless: false }}
        hitSlop={12}
        pointerEvents="auto"
      >
        <View style={styles.circularContent}>
          <Text
            style={titleStyle}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {itemData.displayName}
          </Text>
          <Text style={dateStyle}>{itemData.date}</Text>
        </View>
        <View style={styles.tagContainer}>
          {loadingItems.get(itemId) ? (
            <ActivityIndicator size="small" color="#19C6C1" />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={iconColor}
            />
          )}
        </View>
      </Pressable>
    );
  }, (prev, next) => (
    prev.item.id === next.item.id &&
    prev.loadingItems === next.loadingItems // shallow compare, but Map reference is stable
  ));

  const renderItem = useCallback(({ item, index, section }) => {
    // Ensure item has an ID
    const itemId = item.id || `circular-${item.filename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return (
      <CircularItem
        item={item}
        itemId={itemId}
        isDarkMode={isDarkMode}
        onPress={handleItemPress}
        loadingItems={loadingItems}
      />
    );
  }, [isDarkMode, handleItemPress, loadingItems]);

  // Memoized keyExtractor to prevent unnecessary re-renders
  const keyExtractor = useCallback((item) => {
    return item.id || `circular-${item.filename}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const scrollToSection = useCallback((sectionTitle) => {
    console.log(`Attempting to scroll to section: ${sectionTitle}`);

    // Find the section index
    const sectionIndex = circulars.findIndex(section => section.title === sectionTitle);

    if (sectionIndex !== -1) {
      console.log(`Found section at index: ${sectionIndex}`);

      // Ensure the SectionList is ready
      setTimeout(() => {
        if (sectionListRef.current) {
          try {
            sectionListRef.current.scrollToLocation({
              sectionIndex,
              itemIndex: 0,
              viewOffset: 0,
              animated: true
            });
            console.log(`Scrolled to section ${sectionTitle} at index ${sectionIndex}`);
          } catch (error) {
            console.error('Error scrolling to section:', error);

            // Fallback approach - try again with a delay
            setTimeout(() => {
              try {
                sectionListRef.current?.scrollToLocation({
                  sectionIndex,
                  itemIndex: 0,
                  viewOffset: 0,
                  animated: false
                });
                console.log('Used fallback scroll method');
              } catch (e) {
                console.error('Fallback scroll also failed:', e);
              }
            }, 300);
          }
        }
      }, 50);
    } else {
      console.warn(`Section not found: ${sectionTitle}`);
    }
  }, [circulars]);

  // Reference for section layout cache
  const sectionLayoutCache = useRef({});

  // Add onScrollToIndexFailed handler with improved error handling
  const handleScrollToIndexFailed = useCallback((info) => {
    console.warn('Scroll to index failed:', info);

    // Clear the section layout cache to force recalculation
    sectionLayoutCache.current = {};

    // Try a different approach with a delay
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      if (sectionListRef.current) {
        try {
          // First try with animation off
          sectionListRef.current.scrollToLocation({
            sectionIndex: info.index,
            itemIndex: 0,
            viewOffset: 0,
            animated: false
          });

          // Then try a more gradual approach if needed
          setTimeout(() => {
            if (sectionListRef.current) {
              try {
                sectionListRef.current.scrollToLocation({
                  sectionIndex: info.index,
                  itemIndex: 0,
                  viewOffset: 0,
                  animated: true
                });
              } catch (e) {
                console.error('Second scroll attempt failed:', e);
              }
            }
          }, 300);
        } catch (error) {
          console.error('First scroll attempt failed:', error);
        }
      }
    });
  }, []);

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={searchQuery ? "search-outline" : "document-text-outline"} 
        size={60} 
        color="#64748B" 
      />
      <Text style={styles.emptyText}>
        {loading 
          ? "Loading circulars..." 
          : (searchQuery 
            ? `No circulars found for "${searchQuery}"`
            : "No circulars available"
          )
        }
      </Text>
      
      {!loading && hasDataLoaded && !searchQuery && (
        <TouchableOpacity onPress={handleManualRefresh}>
          <Text style={styles.reloadText}>Tap to reload</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      isDarkMode && styles.containerDark
    ]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={{
          paddingTop: Platform.OS === 'ios' ? 30 : 15,
          paddingBottom: 12,
          paddingHorizontal: 10,
          backgroundColor: isDarkMode ? (theme.background || '#101828') : '#fff',
          shadowColor: isDarkMode ? '#000' : '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: isDarkMode ? 0.4 : 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderBottomWidth: isDarkMode ? 1 : 0,
          borderBottomColor: isDarkMode ? '#2D3748' : 'transparent',
          zIndex: 10,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={26} color={isDarkMode ? '#fff' : '#0F172A'} />
          </TouchableOpacity>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#0F172A',
            textAlign: 'center',
            flex: 1
          }}>
            Circulars
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <Text style={{
          color: isDarkMode ? '#fff' : '#64748B',
          fontSize: 15,
          marginTop: 6,
          marginBottom: 0,
          textAlign: 'center'
        }}>
          University announcements & notices
        </Text>
        {isVisitor && (
          <Text style={{
            color: '#19C6C1',
            fontSize: 12,
            marginTop: 4,
            textAlign: 'center',
            fontWeight: '600'
          }}>
            Visitor Mode - Demo Data
          </Text>
        )}
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, marginTop: 18, marginBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#232B3A' : '#F3F6FA',
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 44,
            borderWidth: isSearching ? 1 : 0,
            borderColor: isSearching ? '#19C6C1' : 'transparent',
          }}
        >
          <Ionicons
            name="search"
            size={20}
            color={isSearching ? '#19C6C1' : (isDarkMode ? '#fff' : '#64748B')}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: isDarkMode ? '#fff' : '#0F172A',
              backgroundColor: 'transparent',
            }}
            placeholder="Search circulars..."
            placeholderTextColor={isDarkMode ? '#A0AEC0' : '#64748B'}
            value={searchQuery}
            onChangeText={handleSearchChange}
            editable={true}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            returnKeyType="search"
            blurOnSubmit={false}
            clearButtonMode="while-editing"
            enablesReturnKeyAutomatically={true}
            textContentType="none"
            autoComplete="off"
            importantForAccessibility="yes"
            accessibilityRole="search"
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#19C6C1" style={{ marginRight: 8 }} />
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons
                name="close-circle"
                size={20}
                color={isDarkMode ? '#A0AEC0' : '#64748B'}
              />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search Results Counter */}
        {searchQuery && (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            paddingHorizontal: 4,
          }}>
            <Text style={{
              fontSize: 12,
              color: isDarkMode ? '#A0AEC0' : '#64748B',
            }}>
              {filteredResultsCount} results
            </Text>
            <TouchableOpacity onPress={clearSearch}>
              <Text style={{
                fontSize: 12,
                color: '#19C6C1',
                fontWeight: '600',
              }}>
                Clear search
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter/Sort Buttons */}
      <View style={{
        flexDirection: 'row',
        gap: 6,
        marginBottom: 8,
        paddingHorizontal: 10,
      }}>
        {/* Group 1: Date/Name */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: isDarkMode ? '#232B3A' : '#E6F8F7',
          borderRadius: 12,
          padding: 4,
          marginRight: 12,
        }}>
          <SortButton
            label="Date"
            active={sortType === 'date'}
            onPress={() => setSortType('date')}
            style={{ borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
            isDarkMode={isDarkMode}
            theme={theme}
          />
          <SortButton
            label="Name"
            active={sortType === 'name'}
            onPress={() => setSortType('name')}
            style={{ borderTopLeftRadius: 5, borderBottomLeftRadius: 5, marginRight: 0 }}
            isDarkMode={isDarkMode}
            theme={theme}
          />
        </View>
        {/* Group 2: Asc/Desc */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: isDarkMode ? '#232B3A' : '#E6F8F7',
          borderRadius: 12,
          padding: 4,
        }}>
          <SortButton
            label="Asc"
            active={sortOrder === 'asc'}
            onPress={() => setSortOrder('asc')}
            style={{ borderTopRightRadius: 5, borderBottomRightRadius: 5 }}
            isDarkMode={isDarkMode}
            theme={theme}
          />
          <SortButton
            label="Desc"
            active={sortOrder === 'desc'}
            onPress={() => setSortOrder('desc')}
            style={{ borderTopLeftRadius: 5, borderBottomLeftRadius: 5, marginRight: 0 }}
            isDarkMode={isDarkMode}
            theme={theme}
          />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <SectionList
          ref={sectionListRef}
          sections={circulars}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 80 }]}
          ListEmptyComponent={
            loading ? null : (originalData.length === 0 ? renderEmptyList : null)
          }
          stickySectionHeadersEnabled={false}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          initialNumToRender={12}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          disableVirtualization={false}
          extraData={[loadingItemsRef.current, debouncedSearchQuery, filteredResultsCount]}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
          onEndReachedThreshold={0.5}
          onEndReached={null}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
        {circulars.length > 0 && (
          <IndexedScrollBar
            sections={circulars}
            onIndexPress={scrollToSection}
            sortType={sortType}
            isDarkMode={isDarkMode}
            sectionListRef={sectionListRef}
            disabled={circulars.length === 0}
          />
        )}
      </View>

      {showFullScreenLoading && (
        <Animated.View style={[
          styles.loadingOverlay,
          {
            opacity: loadingOpacity,
            backgroundColor: isDarkMode ? 'rgba(16, 24, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          }
        ]}
        pointerEvents="box-none"
        >
          <View style={[
            styles.loadingIndicator,
            { backgroundColor: isDarkMode ? theme.surface : '#fff' }
          ]}>
            <ActivityIndicator size="large" color="#19C6C1" />
            <Text style={[
              styles.loadingText,
              { color: isDarkMode ? theme.text : '#0F172A' }
            ]}>
              {loadingProgress > 0
                ? `Loaded ${loadingProgress} items...`
                : 'Connecting to server...'}
            </Text>
          </View>
        </Animated.View>
      )}

      {showConnectingOverlay && !showFullScreenLoading && (
        <Animated.View style={[
          styles.loadingOverlay,
          {
            opacity: loadingOpacity,
            backgroundColor: isDarkMode ? 'rgba(16, 24, 40, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          }
        ]}
        pointerEvents="box-none"
        >
          <View style={[
            styles.loadingIndicator,
            { backgroundColor: isDarkMode ? theme.surface : '#fff' }
          ]}>
            <ActivityIndicator size="large" color="#19C6C1" />
            <Text style={[
              styles.loadingText,
              { color: isDarkMode ? theme.text : '#0F172A' }
            ]}>
              Connecting to server...
            </Text>
          </View>
        </Animated.View>
      )}

      {showSideLoading && (
        <View style={[
          styles.streamingIndicator,
          { backgroundColor: isDarkMode ? theme.surface : '#fff' }
        ]}>
          <ActivityIndicator size="small" color="#19C6C1" />
          <Text style={[
            styles.streamingText,
            { color: isDarkMode ? theme.text : '#0F172A' }
          ]}>
            Loading more... ({loadingProgress})
          </Text>
        </View>
      )}

      {!loading && hasDataLoaded && (
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleManualRefresh}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
};

const SortButton = ({ label, active, onPress, style, isDarkMode }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      {
        backgroundColor: active
          ? '#19C6C1'
          : isDarkMode
            ? '#232B3A'
            : '#E6F8F7',
        paddingVertical: 8,
        paddingHorizontal: 22,
        borderRadius: 8,
        marginRight: 8,
      },
      style,
    ]}
  >
    <Text style={{
      color: active
        ? '#fff'
        : '#19C6C1',
      fontWeight: '600'
    }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  indexedScrollBar: {
    position: 'absolute',
    right: 8,
    top: '40%',
    transform: [{ translateY: -100 }],
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 2,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  indexedScrollBarDark: {
    backgroundColor: '#1E293B',
  },
  indexList: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 0,
  },
  indexItem: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  indexItemActive: {
    transform: [{ scale: 1.3 }],
    shadowColor: '#19C6C1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  indexItemDark: {
    backgroundColor: '#2D3748',
  },
  indexText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  indexTextDark: {
    color: '#E2E8F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#101828',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  monthHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 24,
    marginBottom: 12,
  },
  monthHeaderDark: {
    color: '#0A84FF',
  },
  circularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  circularItemDark: {
    backgroundColor: '#1A2536',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
  },
  circularContent: {
    flex: 1,
    marginRight: 12,
  },
  circularTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 4,
  },
  circularTitleDark: {
    color: '#FFFFFF',
  },
  circularDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  circularDateDark: {
    color: '#8E8E93',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999, // Ensure it appears on top
  },
  loadingIndicator: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
  },
  streamingIndicator: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  streamingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 24,
    left: 24, // Moved to left side to avoid overlap with scroll bar
    backgroundColor: '#19C6C1',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10, // Lower than scroll bar to avoid overlap
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circularItemLoading: {
    opacity: 0.7,
  },
  circularTitleLoading: {
    opacity: 0.7,
  },
  circularDateLoading: {
    opacity: 0.7,
  },
  reloadText: {
    color: '#19C6C1',
    marginTop: 10,
    fontWeight: '600',
  },
  // Performance optimized styles
  circularItemOptimized: {
    // Use transform instead of opacity for better performance
    transform: [{ scale: 1 }],
  },
  circularItemOptimizedLoading: {
    transform: [{ scale: 0.98 }],
    opacity: 0.8,
  },
});

// Add debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default CircularsScreen;

