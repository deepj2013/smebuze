import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Items and stock — GET /inventory/items and GET /inventory/stock
class ItemsStockScreen extends StatefulWidget {
  const ItemsStockScreen({super.key});

  @override
  State<ItemsStockScreen> createState() => _ItemsStockScreenState();
}

class _ItemsStockScreenState extends State<ItemsStockScreen> {
  List<dynamic> _items = [];
  List<dynamic> _stock = [];
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
      final results = await Future.wait([
        ApiService.get('/inventory/items'),
        ApiService.get('/inventory/stock'),
      ]);
      if (!mounted) return;
      final itemsList = results[0] is List ? results[0] as List : (results[0]['data'] as List? ?? results[0]['items'] as List? ?? []);
      final stockList = results[1] is List ? results[1] as List : (results[1]['data'] as List? ?? results[1]['rows'] as List? ?? []);
      setState(() {
        _items = itemsList;
        _stock = stockList;
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

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Items & Stock'),
          actions: [
            IconButton(icon: const Icon(Icons.refresh), onPressed: _loading ? null : _load),
          ],
          bottom: const TabBar(tabs: [Tab(text: 'Items'), Tab(text: 'Stock')]),
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
                : TabBarView(
                    children: [
                      _items.isEmpty
                          ? const Center(child: Text('No items yet.'))
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _items.length,
                                itemBuilder: (context, i) {
                                  final item = _items[i] as Map<String, dynamic>;
                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: ListTile(
                                      title: Text(item['name']?.toString() ?? '—'),
                                      subtitle: Text(item['sku']?.toString() ?? ''),
                                    ),
                                  );
                                },
                              ),
                            ),
                      _stock.isEmpty
                          ? const Center(child: Text('No stock records.'))
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.builder(
                                padding: const EdgeInsets.all(16),
                                itemCount: _stock.length,
                                itemBuilder: (context, i) {
                                  final s = _stock[i] as Map<String, dynamic>;
                                  final item = s['item'] is Map ? s['item'] as Map<String, dynamic> : null;
                                  final qty = s['quantity'] ?? s['qty'] ?? 0;
                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: ListTile(
                                      title: Text(item?['name']?.toString() ?? s['item_id']?.toString() ?? '—'),
                                      trailing: Text('Qty: $qty'),
                                    ),
                                  );
                                },
                              ),
                            ),
                    ],
                  ),
      ),
    );
  }
}
