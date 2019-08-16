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
        # hack for caret
        # for caret, models aren't streamed through `callback_found`,
        # because the models are found on a different system.

        # instead, the solve endpoint is called when initiating a search,
        # which needs a full specification
        if self.system == 'caret':
            self.search.specification = self.specification

        return self.search.run()

