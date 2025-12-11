/**
 * Test script to demonstrate enhanced AlertAggregator functionality
 * Run this to see the improved console output with component hierarchy
 */

import { AlertAggregator } from './AlertAggregator';
import type { DedupedAlert } from './AlertDeduplicator';

// Create sample alerts that simulate your Home component issue
const sampleAlerts: DedupedAlert[] = [
  {
    type: 'warning',
    component: 'Home',
    message: 'Component has excessive re-renders',
    value: 29,
    threshold: 20,
    timestamp: Date.now() - 60000,
    count: 29,
    firstSeen: Date.now() - 120000, // 2 minutes ago
    lastSeen: Date.now(),
    occurrences: [],
    severity: 'critical',
    details: 'state update: posts, prop change: isLoading, parent render: App'
  },
  {
    type: 'warning',
    component: 'PostsFeed',
    message: 'Component has excessive re-renders',
    value: 15,
    threshold: 20,
    timestamp: Date.now() - 60000,
    count: 15,
    firstSeen: Date.now() - 120000,
    lastSeen: Date.now(),
    occurrences: [],
    severity: 'medium',
    details: 'prop change: posts, context change: theme'
  },
  {
    type: 'warning',
    component: 'Post',
    message: 'Component has excessive re-renders',
    value: 45,
    threshold: 20,
    timestamp: Date.now() - 60000,
    count: 45,
    firstSeen: Date.now() - 120000,
    lastSeen: Date.now(),
    occurrences: [],
    severity: 'critical',
    details: 'prop change: post, parent render: PostsFeed'
  },
  {
    type: 'warning',
    component: 'PostComposer',
    message: 'Component has excessive re-renders',
    value: 8,
    threshold: 20,
    timestamp: Date.now() - 60000,
    count: 8,
    firstSeen: Date.now() - 120000,
    lastSeen: Date.now(),
    occurrences: [],
    severity: 'low',
    details: 'state update: text, hook dependency: useCallback'
  },
  {
    type: 'warning',
    operation: 'fetchPosts',
    message: 'Operation has slow average execution time',
    value: 250,
    threshold: 100,
    timestamp: Date.now() - 60000,
    count: 28,
    firstSeen: Date.now() - 120000,
    lastSeen: Date.now(),
    occurrences: [],
    severity: 'medium',
    details: 'API response time exceeded threshold'
  }
];

// Test the enhanced aggregator
function testEnhancedAggregator() {
  console.log('🧪 Testing Enhanced AlertAggregator...\n');
  
  const aggregator = new AlertAggregator(5000); // 5 second throttle for demo
  
  // Force logging by resetting throttle
  aggregator.resetThrottle();
  
  // This will show the new enhanced output
  aggregator.logAggregatedAlerts(sampleAlerts);
  
  console.log('\n✅ Enhanced AlertAggregator test complete!');
  console.log('\n📝 What you should see above:');
  console.log('   • Component hierarchy showing which child components are causing Home to re-render');
  console.log('   • Render counts for each component');
  console.log('   • Specific causes (state changes, prop changes, etc.)');
  console.log('   • Components sorted by render frequency');
}

// Run the test
testEnhancedAggregator();