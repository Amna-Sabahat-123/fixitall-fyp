from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

DATA_FILE = 'user_inputs.json'
PROVIDER_FILE = '../updated_dummy_service_providers.json'  # adjust path if needed

@app.route('/store_input', methods=['POST'])
def store_input():
    input_data = request.json
    if not input_data:
        return jsonify({"success": False, "message": "No input received"}), 400

    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
    else:
        data = []

    data.append(input_data)
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

    return jsonify({"success": True, "message": "Input stored", "data": input_data})

# 🔍 NEW: Get service providers by category
@app.route('/providers', methods=['GET'])
def get_providers():
    category = request.args.get('category')
    if not category:
        return jsonify({"success": False, "message": "Missing category"}), 400

    try:
        with open(PROVIDER_FILE, 'r') as f:
            providers = json.load(f)
    except Exception as e:
        return jsonify({"success": False, "message": f"Error reading provider file: {str(e)}"}), 500

    matched = [p for p in providers if p['serviceCategory'] == category]

    return jsonify({"success": True, "providers": matched})
if __name__ == '__main__':
    app.run(port=5000, debug=True)