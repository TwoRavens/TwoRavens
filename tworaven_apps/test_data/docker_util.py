"""
shortcut to run docker remove commands
"""

def get_rmi_command(info_list):
    """
    JUST USE: docker rmi $(docker images -f "dangling=true" -q)
    <none>              <none>              591446e60492        4 days ago          796MB
    <none>              <none>              f2f37f4e35fa        4 days ago          1.02GB
    <none>              <none>              ff14b547855c        4 days ago          1.02GB
    """
    image_ids = []
    for line in info_list.split('\n'):
        items = line.split()
        if items and items[0] == '<none>':
            image_ids.append(items[2])
    #
    print('docker rmi %s' % ' '.join(image_ids))


def get_rm_command(info_list):
    """
    JUST USE: docker rm $(docker ps -q -f status=exited)

    CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                    PORTS               NAMES
    9094581ecdcf        9721cecf623c        "/bin/sh -c '/bin/..."   4 days ago          Exited (126) 4 days ago                       frosty_colden
    7e3c9c8a6e4d        591446e60492        "/bin/sh -c '/bin/..."   4 days ago          Exited (1) 4 days ago                         gallant_pare
    """
    image_ids = []
    for line in info_list.split('\n'):
        items = line.split()
        if items and items[0] != 'CONTAINER':
            image_ids.append(items[1])
    #
    print('docker rm %s' % ' '.join(image_ids))
