import time

import requests

from model import DJANGO_SOLVER_SERVICE, KEY_SUCCESS, KEY_DATA
from util_search import SearchAutoSklearn, SearchCaret, SearchH2O, SearchTPOT


class Solve(object):
    def __init__(self, system, specification, callback_found, system_params=None):
        self.system = system
        self.specification = specification
        self.system_params = system_params or {}
        self.search = {
            'auto_sklearn': SearchAutoSklearn,
            'h2o': SearchH2O,
            'tpot': SearchTPOT,
            'caret': SearchCaret
        }[system](self.specification['search'], self.system_params, callback_found)

    async def run(self):
        start_time = time.time()
        await self.search.run()
        requests.post(
            url=DJANGO_SOLVER_SERVICE + 'finished',
            json={
                KEY_SUCCESS: True,
                KEY_DATA: {
                    "search_id": self.search.search_id,
                    "elapsed_time": time.time() - start_time
                }
            })

