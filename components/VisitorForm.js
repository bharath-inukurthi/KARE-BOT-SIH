import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../lib/supabase';

const VisitorForm = ({ visible, onClose, onSuccess }) => {
  const { theme, isDarkMode } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !reason.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting visitor form with data:', { name, email, reason });
      
      // Try to save to Supabase first
      let supabaseSuccess = false;
      try {
        const { data, error } = await supabase
          .from('visitors')
          .insert([
            {
              name: name.trim(),
              email: email.trim(),
              reason: reason.trim()
            }
          ]);

        console.log('Supabase response:', { data, error });

        if (error) {
          console.warn('Supabase error (will use fallback):', error.message);
        } else {
          supabaseSuccess = true;
        }
      } catch (dbError) {
        console.warn('Database error (using fallback):', dbError.message);
      }

      // If database failed, save to AsyncStorage as fallback
      if (!supabaseSuccess) {
        console.log('Using AsyncStorage fallback for visitor data');
        try {
          const visitorData = {
            name: name.trim(),
            email: email.trim(),
            reason: reason.trim(),
            timestamp: new Date().toISOString()
          };
          
          // Get existing visitors or create new array
          const existingVisitors = await AsyncStorage.getItem('visitors');
          const visitors = existingVisitors ? JSON.parse(existingVisitors) : [];
          visitors.push(visitorData);
          
          await AsyncStorage.setItem('visitors', JSON.stringify(visitors));
          console.log('Visitor data saved to AsyncStorage');
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
        }
      }

      Alert.alert('Success', `Thank you for registering${supabaseSuccess ? '' : ' (local storage)'}. You can now explore the campus tools.`);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      Alert.alert('Error', `An unexpected error occurred: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Visitor Registration</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text style={[styles.label, { color: theme.text }]}>Name *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.label, { color: theme.text }]}>Email *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: theme.text }]}>Reason for Visit *</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              value={reason}
              onChangeText={setReason}
              placeholder="Tell us why you're visiting (e.g., campus tour, meeting, research, etc.)"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: loading ? theme.textSecondary : '#007AFF' }
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Registering...' : 'Register as Visitor'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VisitorForm;
