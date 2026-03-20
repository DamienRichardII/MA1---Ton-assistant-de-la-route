import sys
import platform

def main():
    print("✅ Python:", sys.version.split()[0])
    print("✅ Executable:", sys.executable)
    print("✅ OS:", platform.platform())

if __name__ == "__main__":
    main()
    # src/settings.py
MIN_SOURCES = 1          # minimum de sources à citer
MIN_SCORE = 0.25         # seuil (à ajuster quand on aura l’index)
MAX_CONTEXT_CHUNKS = 5   # nombre de passages fournis au modèle



