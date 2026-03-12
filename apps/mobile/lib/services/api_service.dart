import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// SMEBUZZ API client — same base URL and Bearer token as web.
/// See docs/API_FOR_MOBILE.md for full endpoint list.
class ApiService {
  static const _tokenKey = 'smebuzz_token';
  static String baseUrl = 'http://localhost:3000';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
    String? tenantSlug,
  }) async {
    final body = <String, dynamic>{
      'email': email,
      'password': password,
    };
    if (tenantSlug != null && tenantSlug.isNotEmpty) {
      body['tenantSlug'] = tenantSlug;
    }
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>? ?? {};
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['message'] ?? data['error'] ?? 'Login failed');
    }
    final token = data['access_token'] as String?;
    if (token != null) await setToken(token);
    return data;
  }

  static Future<Map<String, dynamic>> get(String path) async {
    final token = await getToken();
    if (token == null) throw Exception('Not logged in');
    final url = path.startsWith('/') ? '$baseUrl/api/v1$path' : '$baseUrl/api/v1/$path';
    final res = await http.get(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>? ?? {};
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['message'] ?? data['error'] ?? 'Request failed');
    }
    return data;
  }

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final token = await getToken();
    if (token == null) throw Exception('Not logged in');
    final url = path.startsWith('/') ? '$baseUrl/api/v1$path' : '$baseUrl/api/v1/$path';
    final res = await http.post(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>? ?? {};
    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception(data['message'] ?? data['error'] ?? 'Request failed');
    }
    return data;
  }
}
