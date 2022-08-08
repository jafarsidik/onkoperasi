from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in onkoperasi/__init__.py
from onkoperasi import __version__ as version

setup(
	name="onkoperasi",
	version=version,
	description="OnKoperasi",
	author="IDMS",
	author_email="jeff.sidik@gmail.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
