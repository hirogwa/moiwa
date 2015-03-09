VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.hostname = "moiwa"

  config.vm.synced_folder "./", "/home/vagrant/moiwa", type: "nfs"

  config.vm.network "forwarded_port", guest: 5000, host: 5005
  config.vm.network "forwarded_port", guest: 5432, host: 5431
  config.vm.network "private_network", ip: "192.168.1.100"

  config.vm.provision "ansible" do |ansible|
    ansible.verbose = "vvvv"
    ansible.limit = "all"
    ansible.playbook = "./ansible/local.yaml"
    ansible.inventory_path = "./ansible/development"
  end
end
