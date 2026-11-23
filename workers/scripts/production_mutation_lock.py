import os

def require_local_mutation_authorization(tool: str) -> None:
    lock = os.environ.get('PRODUCTION_MUTATION_LOCKED', 'true').lower()
    environment = os.environ.get('ZAYRON_ENVIRONMENT', '')
    authorization = os.environ.get('EXPLICIT_PRODUCTION_MUTATION_AUTHORIZATION', '')
    if lock == 'true' or environment != 'LOCAL' or authorization != 'I_UNDERSTAND_PRODUCTION_MUTATION':
        raise RuntimeError(f'PRODUCTION_MUTATION_LOCKED: {tool}')
