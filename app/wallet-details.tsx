import { getRecentTransactions, getWalletData, Transaction, WalletData } from '@/utils/solana';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WalletDetailsScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    if (!address) return;
    
    try {
      const [data, txs] = await Promise.all([
        getWalletData(address),
        getRecentTransactions(address),
      ]);
      setWalletData(data);
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [address]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const truncateTxSignature = (sig: string) => {
    return `${sig.slice(0, 6)}...${sig.slice(-6)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5DD3" />
        <Text style={styles.loadingText}>Loading wallet details...</Text>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load wallet data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#6C5DD3"
          colors={['#6C5DD3']}
        />
      }
    >
      {/* Wallet Header */}
      <View style={styles.header}>
        <View style={styles.walletIconLarge}>
          <Ionicons name="wallet" size={32} color="#6C5DD3" />
        </View>
        <Text style={styles.walletAddress}>{truncateAddress(address!)}</Text>
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={() => {
            Alert.alert('Address', address);
          }}
        >
          <Ionicons name="copy-outline" size={16} color="#6C5DD3" />
          <Text style={styles.copyButtonText}>Copy Address</Text>
        </TouchableOpacity>
      </View>

      {/* Total Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>
          ${walletData.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={styles.balanceBreakdown}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>SOL</Text>
            <Text style={styles.balanceItemValue}>{walletData.solBalance.toFixed(4)}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemLabel}>Tokens</Text>
            <Text style={styles.balanceItemValue}>{walletData.tokens.length}</Text>
          </View>
        </View>
      </View>

      {/* Token Holdings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Token Holdings</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{walletData.tokens.length + 1}</Text>
          </View>
        </View>

        {/* SOL Token */}
        <View style={styles.tokenCard}>
          <View style={styles.tokenLeft}>
            <View style={[styles.tokenIcon, { backgroundColor: '#9945FF15' }]}>
              <Ionicons name="logo-ionic" size={24} color="#9945FF" />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenSymbol}>SOL</Text>
              <Text style={styles.tokenName}>Solana</Text>
            </View>
          </View>
          <View style={styles.tokenRight}>
            <Text style={styles.tokenAmount}>{walletData.solBalance.toFixed(4)}</Text>
            <Text style={styles.tokenValue}>
              ${(walletData.totalUSD - walletData.tokens.reduce((sum, t) => sum + t.usdValue, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Other Tokens */}
        {walletData.tokens.map((token) => (
          <View key={token.mint} style={styles.tokenCard}>
            <View style={styles.tokenLeft}>
              <View style={styles.tokenIcon}>
                <Text style={styles.tokenIconText}>{token.symbol.slice(0, 2)}</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                <Text style={styles.tokenName}>{truncateAddress(token.mint)}</Text>
              </View>
            </View>
            <View style={styles.tokenRight}>
              <Text style={styles.tokenAmount}>
                {token.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </Text>
              <Text style={styles.tokenValue}>
                ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{transactions.length}</Text>
          </View>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No recent transactions</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.signature} style={styles.txCard}>
              <View style={styles.txLeft}>
                <View style={[
                  styles.txIcon,
                  { backgroundColor: tx.type === 'receive' ? '#10B98115' : '#EF444415' }
                ]}>
                  <Ionicons
                    name={tx.type === 'receive' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={tx.type === 'receive' ? '#10B981' : '#EF4444'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>
                    {tx.type === 'receive' ? 'Received' : 'Sent'}
                  </Text>
                  <Text style={styles.txSignature}>{truncateTxSignature(tx.signature)}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[
                  styles.txAmount,
                  { color: tx.type === 'receive' ? '#10B981' : '#EF4444' }
                ]}>
                  {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)} SOL
                </Text>
                <Text style={styles.txTime}>{formatDate(tx.timestamp)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  walletIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletAddress: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6C5DD3',
  },
  balanceCard: {
    backgroundColor: '#6C5DD3',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#E0D9FF',
    marginBottom: 8,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
  },
  balanceItemLabel: {
    fontSize: 12,
    color: '#E0D9FF',
    marginBottom: 4,
  },
  balanceItemValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#9B8AE8',
    marginHorizontal: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tokenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  tokenIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C5DD3',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tokenName: {
    fontSize: 13,
    color: '#6B7280',
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  tokenValue: {
    fontSize: 13,
    color: '#6B7280',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  txSignature: {
    fontSize: 12,
    color: '#6B7280',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  txTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
});
