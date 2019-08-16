from util_search import SearchAutoSklearn, SearchCaret, SearchH2O, SearchTPOT


class Solve(object):
    def __init__(self, system, specification, callback_found, system_params=None, callback_params=None):
        self.system = system
        self.specification = specification
        self.system_params = system_params or {}
        self.search = {
            'auto_sklearn': SearchAutoSklearn,
            'h2o': SearchH2O,
            'tpot': SearchTPOT,
            'caret': SearchCaret
        }[system](self.specification['search'], self.system_params,
                  callback_found, callback_params=callback_params)

    def run(self):
        return self.search.run()

