import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getWalletData, WalletData } from '@/utils/solana';

const WALLETS_STORAGE_KEY = 'solana_wallets';

export default function HomeScreen() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [walletData, setWalletData] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const loadWallets = async () => {
    try {
      const stored = await AsyncStorage.getItem(WALLETS_STORAGE_KEY);
      const addresses = stored ? JSON.parse(stored) : [];
      setWallets(addresses);
      return addresses;
    } catch (error) {
      Alert.alert('Error', 'Failed to load wallets');
      return [];
    }
  };

  const fetchAllWalletData = async (addresses: string[]) => {
    if (addresses.length === 0) {
      setWalletData([]);
      return;
    }

    try {
      const dataPromises = addresses.map(address => 
        getWalletData(address).catch(error => {
          console.error(`Error fetching ${address}:`, error);
          return null;
        })
      );
      
      const results = await Promise.all(dataPromises);
      const validData = results.filter((data): data is WalletData => data !== null);
      setWalletData(validData);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch wallet data');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    const addresses = await loadWallets();
    await fetchAllWalletData(addresses);
    setIsLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllWalletData(wallets);
    setIsRefreshing(false);
  }, [wallets]);

  const deleteWallet = async (address: string) => {
    Alert.alert(
      'Remove Wallet',
      `Remove ${truncateAddress(address)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = wallets.filter(w => w !== address);
              await AsyncStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(updated));
              setWallets(updated);
              setWalletData(walletData.filter(w => w.address !== address));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove wallet');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = router.subscribe?.(() => {
      loadData();
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  const totalNetWorth = walletData.reduce((sum, wallet) => sum + wallet.totalUSD, 0);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const renderWalletCard = ({ item }: { item: WalletData }) => (
    <TouchableOpacity
      style={styles.walletCard}
      onLongPress={() => deleteWallet(item.address)}
      activeOpacity={0.7}
    >
      <View style={styles.walletCardHeader}>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet-outline" size={24} color="#6C5DD3" />
        </View>
        <View style={styles.walletInfo}>
          <Text style={styles.walletAddress}>{truncateAddress(item.address)}</Text>
          <View style={styles.walletStats}>
            <Text style={styles.walletStatText}>
              {item.solBalance.toFixed(2)} SOL
            </Text>
            <Text style={styles.walletStatDivider}>•</Text>
            <Text style={styles.walletStatText}>
              {item.tokens.length} token{item.tokens.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.walletValue}>${item.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="wallet-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No Wallets Yet</Text>
      <Text style={styles.emptySubtitle}>Add a wallet to start tracking your net worth</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5DD3" />
        <Text style={styles.loadingText}>Loading wallets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Ionicons name="stats-chart" size={28} color="#6C5DD3" />
            <Text style={styles.headerTitle}>BAL</Text>
          </View>
        </View>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>
            ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceStat}>
              <Ionicons name="wallet-outline" size={16} color="#6B7280" />
              <Text style={styles.balanceStatText}>{walletData.length} wallet{walletData.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Wallets</Text>
          <TouchableOpacity
            style={styles.addWalletButton}
            onPress={() => router.push('/add-wallet')}
          >
            <Ionicons name="add-circle" size={20} color="#6C5DD3" />
            <Text style={styles.addWalletButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={walletData}
          renderItem={renderWalletCard}
          keyExtractor={(item) => item.address}
          contentContainerStyle={[
            styles.listContent,
            walletData.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#6C5DD3"
              colors={['#6C5DD3']}
            />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#F9FAFB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 0.5,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceStatText: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  addWalletButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C5DD3',
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentEmpty: {
    flex: 1,
  },
  walletCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  walletStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletStatText: {
    fontSize: 13,
    color: '#6B7280',
  },
  walletStatDivider: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  walletValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});

