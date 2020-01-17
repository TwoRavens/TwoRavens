from tworaven_apps.solver_interfaces.util_search import (
    SearchAutoSklearn,
    SearchCaret,
    SearchH2O,
    SearchTPOT,
    SearchLudwig,
    SearchMLJarSupervised,
    SearchMLBox,
    SearchTwoRavens)


class Solve(object):
    def __init__(self, system, specification,
                 callback_found: str, callback_arguments=None,
                 system_params=None, search_id=None):
        self.system = system
        self.specification = specification
        self.system_params = system_params or {}
        self.search = {
            'auto_sklearn': SearchAutoSklearn,
            'h2o': SearchH2O,
            'tpot': SearchTPOT,
            'caret': SearchCaret,
            'ludwig': SearchLudwig,
            'mljar-supervised': SearchMLJarSupervised,
            'mlbox': SearchMLBox,
            'two-ravens': SearchTwoRavens
        }[system](
            specification=self.specification['search'],
            callback_found=callback_found,
            callback_arguments=callback_arguments,
            system_params=self.system_params,
            search_id=search_id)

    def run(self):
        return self.search.run()

