import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Invoice detail and record payment — GET /sales/invoices/:id, POST /sales/invoices/:id/payment
class InvoiceDetailScreen extends StatefulWidget {
  final String invoiceId;

  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  Map<String, dynamic>? _invoice;
  String? _error;
  bool _loading = true;
  final _amountController = TextEditingController();
  final _paymentDateController = TextEditingController(text: DateTime.now().toIso8601String().split('T')[0]);
  bool _saving = false;
  String? _saveError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _paymentDateController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/sales/invoices/${widget.invoiceId}');
      if (!mounted) return;
      setState(() {
        _invoice = data is Map<String, dynamic> ? data : null;
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

  Future<void> _recordPayment() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _saveError = 'Enter a valid amount');
      return;
    }
    setState(() {
      _saving = true;
      _saveError = null;
    });
    try {
      await ApiService.post(
        '/sales/invoices/${widget.invoiceId}/payment',
        {
          'amount': amount,
          'payment_date': _paymentDateController.text.trim(),
          'mode': 'cash',
        },
      );
      if (!mounted) return;
      _amountController.clear();
      await _load();
      setState(() => _saving = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded')));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saveError = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
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
        title: Text(_invoice?['number']?.toString() ?? 'Invoice'),
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
              : _invoice == null
                  ? const Center(child: Text('Invoice not found'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Total: ₹${_num(_invoice!['total'])}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text('Paid: ₹${_num(_invoice!['paid_amount'])}'),
                                  Text('Due: ₹${_num((double.tryParse(_invoice!['total']?.toString() ?? '') ?? 0) - (double.tryParse(_invoice!['paid_amount']?.toString() ?? '') ?? 0))}', style: const TextStyle(color: Colors.orange)),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          const Text('Record payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _amountController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(
                              labelText: 'Amount',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _paymentDateController,
                            decoration: const InputDecoration(
                              labelText: 'Payment date',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          if (_saveError != null) ...[
                            const SizedBox(height: 8),
                            Text(_saveError!, style: const TextStyle(color: Colors.red)),
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: _saving ? null : _recordPayment,
                            child: Text(_saving ? 'Saving…' : 'Record payment'),
                          ),
                        ],
                      ),
                    ),
    );
  }
}
