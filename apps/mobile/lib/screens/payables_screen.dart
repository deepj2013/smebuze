import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Payables list — GET /purchase/payables
class PayablesScreen extends StatefulWidget {
  const PayablesScreen({super.key});

  @override
  State<PayablesScreen> createState() => _PayablesScreenState();
}

class _PayablesScreenState extends State<PayablesScreen> {
  List<dynamic> _orders = [];
  double _totalPayable = 0;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/purchase/payables');
      if (!mounted) return;
      final orders = data['orders'] as List? ?? [];
      final total = (data['totalPayable'] is num) ? (data['totalPayable'] as num).toDouble() : 0.0;
      setState(() {
        _orders = orders;
        _totalPayable = total;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  String _num(dynamic v) {
    if (v == null) return '0';
    if (v is num) return v.toStringAsFixed(2);
    return v.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payables'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        FilledButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _orders.isEmpty
                  ? const Center(child: Text('No payables.'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text(
                                'Total payable: ₹${_num(_totalPayable)}',
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          ..._orders.map<Widget>((o) {
                            final po = o as Map<String, dynamic>;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                title: Text(po['number']?.toString() ?? '—'),
                                subtitle: Text(po['vendor']?.toString() ?? '—'),
                                trailing: Text('₹${_num(po['due'])}', style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.deepOrange)),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
    );
  }
}
