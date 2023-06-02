#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Plug {
    #[init]
    fn init(&self) {}

    #[only_owner]
    #[endpoint(registerMembersSnapshot)]
    fn register_members_snapshot_endpoint(
        &self,
        entries: MultiValueEncoded<MultiValue2<ManagedAddress, BigUint>>,
    ) {
        for entry in entries.into_iter() {
            let (address, weight) = entry.into_tuple();

            self.members().insert(address, weight);
        }
    }

    #[view(getDaoVoteWeight)]
    fn get_dao_vote_weight_view(
        &self,
        address: ManagedAddress,
        _token: OptionalValue<TokenIdentifier>,
    ) -> BigUint {
        self.members().get(&address).unwrap_or_default()
    }

    #[view(getDaoMembers)]
    fn get_dao_members_view(
        &self,
        _token: OptionalValue<TokenIdentifier>,
    ) -> MultiValueEncoded<MultiValue2<ManagedAddress, BigUint>> {
        let mut members_multi = MultiValueEncoded::new();

        for (address, weight) in self.members().iter() {
            members_multi.push((address, weight).into());
        }

        members_multi.into()
    }

    #[storage_mapper("members")]
    fn members(&self) -> MapMapper<ManagedAddress, BigUint>;
}
