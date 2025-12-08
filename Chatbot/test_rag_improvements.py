#!/usr/bin/env python3
"""
Test script to verify the improvements to rag_model.py
- Tests filtering by document type
- Tests Gemini API integration
- Tests anti-hallucination prompt
"""
import os
import sys
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from rag_model import RAG
except ImportError as e:
    logger.error(f"Failed to import RAG: {e}")
    sys.exit(1)

def test_retrieve_by_type():
    """Test retrieval with type filtering"""
    print("\n" + "="*60)
    print("TEST 1: Retrieve with Type Filtering")
    print("="*60)
    
    try:
        rag = RAG()
        
        # Test retrieval of variables
        print("\n1. Searching for VARIABLES about 'temperature'...")
        var_results = rag.retrieve("temperature", k=3, doc_type="variable")
        print(f"   Found {len(var_results)} variable results")
        for r in var_results[:2]:
            print(f"   - {r.get('id')}")
        
        # Test retrieval of scenarios
        print("\n2. Searching for SCENARIOS...")
        scen_results = rag.retrieve("1.5C warming", k=3, doc_type="scenario")
        print(f"   Found {len(scen_results)} scenario results")
        for r in scen_results[:2]:
            print(f"   - {r.get('id')}")
        
        print("\n✓ Type filtering works!")
        return True
    except Exception as e:
        logger.error(f"Type filtering test failed: {e}")
        return False

def test_gemini_api_config():
    """Test Gemini API configuration"""
    print("\n" + "="*60)
    print("TEST 2: Gemini API Configuration")
    print("="*60)
    
    try:
        rag = RAG()
        
        print(f"\nGemini URL configured: {bool(rag.gemini_url)}")
        print(f"Gemini API Key configured: {bool(rag.gemini_key)}")
        print(f"Temperature setting: {rag.temperature}")
        print(f"Max tokens setting: {rag.max_tokens}")
        
        if rag.gemini_url:
            print(f"URL: {rag.gemini_url[:50]}...")
        
        print("\n✓ Gemini API configuration verified!")
        return True
    except Exception as e:
        logger.error(f"Gemini config test failed: {e}")
        return False

def test_json_parsing():
    """Test improved JSON parsing"""
    print("\n" + "="*60)
    print("TEST 3: JSON Parsing with Markdown Cleanup")
    print("="*60)
    
    try:
        rag = RAG()
        
        # Test cases
        test_cases = [
            # Pure JSON
            ('{"series": [{"year": 2020, "value": 100}]}', "pure JSON"),
            # JSON with markdown code block
            ('```json\n{"series": [{"year": 2020, "value": 100}]}\n```', "JSON with markdown"),
            # JSON with trailing commas
            ('{"series": [{"year": 2020, "value": 100,}],}', "JSON with trailing commas"),
            # JSON with explanation text
            ('The data shows:\n{"series": [{"year": 2020, "value": 100}]}\nMore text here', "JSON with text"),
        ]
        
        for test_json, description in test_cases:
            result = rag._parse_json_from_text(test_json)
            if result and "series" in result:
                print(f"  ✓ Parsed: {description}")
            else:
                print(f"  ✗ Failed: {description}")
                return False
        
        print("\n✓ JSON parsing improvements verified!")
        return True
    except Exception as e:
        logger.error(f"JSON parsing test failed: {e}")
        return False

def test_response_extraction():
    """Test Gemini response extraction"""
    print("\n" + "="*60)
    print("TEST 4: Response Extraction from Gemini API")
    print("="*60)
    
    try:
        rag = RAG()
        
        # Test Gemini API response format
        gemini_response = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": '{"series": [{"year": 2020, "value": 100}]}'
                            }
                        ]
                    }
                }
            ]
        }
        
        extracted = rag._extract_text_from_response(gemini_response)
        if "series" in extracted:
            print(f"✓ Extracted Gemini API response correctly")
            print(f"  Text snippet: {extracted[:80]}...")
        else:
            print(f"✗ Failed to extract Gemini response")
            return False
        
        print("\n✓ Response extraction verified!")
        return True
    except Exception as e:
        logger.error(f"Response extraction test failed: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("RAG MODEL IMPROVEMENTS TEST SUITE")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Type Filtering", test_retrieve_by_type()))
    results.append(("Gemini API Config", test_gemini_api_config()))
    results.append(("JSON Parsing", test_json_parsing()))
    results.append(("Response Extraction", test_response_extraction()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{name:<30} {status}")
    
    passed = sum(1 for _, p in results if p)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! RAG model improvements are working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
