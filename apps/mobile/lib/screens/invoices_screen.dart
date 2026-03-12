import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'invoice_detail_screen.dart';

/// Invoice list — GET /sales/invoices
class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  List<dynamic> _list = [];
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
      final data = await ApiService.get('/sales/invoices');
      if (!mounted) return;
      final list = data is List ? data : (data['invoices'] as List? ?? data['data'] as List? ?? []);
      setState(() {
        _list = list;
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
        title: const Text('Invoices'),
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
              : _list.isEmpty
                  ? const Center(child: Text('No invoices yet.'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _list.length,
                        itemBuilder: (context, i) {
                          final inv = _list[i] as Map<String, dynamic>;
                          final total = inv['total'];
                          final number = inv['number']?.toString() ?? '—';
                          final date = inv['invoice_date']?.toString() ?? inv['date']?.toString() ?? '';
                          final status = inv['status']?.toString() ?? '';
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(number),
                              subtitle: Text('$date · $status'),
                              trailing: Text('₹${_num(total)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                              onTap: () {
                                final id = inv['id']?.toString();
                                if (id != null) {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => InvoiceDetailScreen(invoiceId: id),
                                    ),
                                  );
                                }
                              },
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
